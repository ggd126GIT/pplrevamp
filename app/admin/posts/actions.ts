"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { deriveAction, logActivity } from "@/lib/activity";
import { manilaDateTime } from "@/lib/dates";
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
  // null = cleared (fall back to publish time), undefined = malformed. Kept out
  // of the returned row so callers decide what a blank field means.
  const publishedAt = manilaDateTime(String(formData.get("published_at") ?? ""));
  return {
    row: { title, slug, byline, excerpt, cover_image_url, status, content },
    publishedAt,
  };
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { row: data, publishedAt } = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };
  if (publishedAt === undefined)
    return { error: "Enter a valid published date and time." };

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
      // An explicit date wins, so a post can go live already backdated.
      published_at: publishedAt ?? (published ? new Date().toISOString() : null),
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
  // Land on the new post's editor, not the list: preview only exists once a row
  // does, so this is what puts "read it before it goes live" one click from
  // saving. Falls back to the list if the insert somehow returned no id.
  redirect(created?.id ? `/admin/posts/${created.id}` : "/admin/posts");
}

export async function updatePost(
  id: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { row: data, publishedAt } = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };
  if (publishedAt === undefined)
    return { error: "Enter a valid published date and time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  const { data: existing } = await supabase
    .from("posts")
    .select("published_at, status")
    .eq("id", id)
    .single();

  // Status is the signal for "has this been live before", not published_at —
  // the date is editor-owned now and survives a return to draft, so it can no
  // longer stand in for publication history.
  const wasPublished = existing?.status === "published";

  // The editor's date wins. Blank keeps whatever is stored, and stamps now the
  // first time a post goes live. Returning to draft deliberately does NOT clear
  // it: discarding a date someone set is data loss, and the public pages all
  // filter on status, so an unpublished post stays invisible regardless.
  let published_at = publishedAt ?? existing?.published_at ?? null;
  if (data.status === "published" && !published_at) {
    published_at = new Date().toISOString();
  }

  const update: TablesUpdate<"posts"> = {
    ...data,
    published_at,
    updated_by: actorId,
  };
  // published_by is cleared when a post goes back to draft, set on the edit
  // that first takes it live, and left untouched otherwise.
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
