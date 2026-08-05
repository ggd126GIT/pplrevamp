"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { deriveAction, logActivity } from "@/lib/activity";
import type { Json, TablesUpdate } from "@/lib/database.types";

export type PostFormState = { error?: string } | undefined;

function parseContent(raw: string): Json {
  try {
    return JSON.parse(raw) as Json;
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] } as unknown as Json;
  }
}

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim() || title);
  // The public display credit. Distinct from author_id, which the action sets
  // to whoever is signed in — usually not the writer.
  const byline = String(formData.get("byline") ?? "").trim() || null;
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const cover_image_url =
    String(formData.get("cover_image_url") ?? "").trim() || null;
  const status =
    String(formData.get("status") ?? "draft") === "published"
      ? "published"
      : "draft";
  const content = parseContent(String(formData.get("content") ?? ""));
  return { title, slug, byline, excerpt, cover_image_url, status, content };
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;
  const published = data.status === "published";

  const { data: created, error } = await supabase
    .from("posts")
    .insert({
      ...data,
      author_id: actorId,
      updated_by: actorId,
      published_by: published ? actorId : null,
      published_at: published ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  const logged = {
    entityType: "post" as const,
    entityId: created?.id ?? null,
    entityTitle: data.title,
    actorId,
  };
  await logActivity(supabase, { ...logged, action: "created" });
  // A post created already-live gets both entries, so the timeline doesn't
  // imply it was quietly born public.
  if (published) {
    await logActivity(supabase, { ...logged, action: "published" });
  }

  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function updatePost(
  id: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  // Preserve original published_at; set it the first time it goes live.
  const { data: existing } = await supabase
    .from("posts")
    .select("published_at, status")
    .eq("id", id)
    .single();

  const wasPublished = Boolean(existing?.published_at);
  let published_at = existing?.published_at ?? null;
  if (data.status === "published" && !published_at) {
    published_at = new Date().toISOString();
  }
  if (data.status === "draft") {
    published_at = null;
  }

  const update: TablesUpdate<"posts"> = {
    ...data,
    published_at,
    updated_by: actorId,
  };
  // published_by tracks published_at: cleared when a post goes back to draft,
  // set on the edit that first takes it live, untouched otherwise.
  if (data.status === "draft") {
    update.published_by = null;
  } else if (!wasPublished) {
    update.published_by = actorId;
  }

  const { error } = await supabase.from("posts").update(update).eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  await logActivity(supabase, {
    action: deriveAction("post", existing?.status, data.status),
    entityType: "post",
    entityId: id,
    entityTitle: data.title,
    actorId,
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read the title first — once the row is gone it is unrecoverable, and the
  // deletion entry is the one you most want to be able to read later.
  const { data: existing } = await supabase
    .from("posts")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (!error) {
    await logActivity(supabase, {
      action: "deleted",
      entityType: "post",
      entityId: id,
      entityTitle: existing?.title ?? "(untitled post)",
      actorId: user?.id ?? null,
    });
  }

  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
