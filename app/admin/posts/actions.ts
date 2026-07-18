"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { Json } from "@/lib/database.types";

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
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const cover_image_url =
    String(formData.get("cover_image_url") ?? "").trim() || null;
  const status =
    String(formData.get("status") ?? "draft") === "published"
      ? "published"
      : "draft";
  const content = parseContent(String(formData.get("content") ?? ""));
  return { title, slug, excerpt, cover_image_url, status, content };
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

  const { error } = await supabase.from("posts").insert({
    ...data,
    author_id: user?.id ?? null,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
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

  // Preserve original published_at; set it the first time it goes live.
  const { data: existing } = await supabase
    .from("posts")
    .select("published_at, status")
    .eq("id", id)
    .single();

  let published_at = existing?.published_at ?? null;
  if (data.status === "published" && !published_at) {
    published_at = new Date().toISOString();
  }
  if (data.status === "draft") {
    published_at = null;
  }

  const { error } = await supabase
    .from("posts")
    .update({ ...data, published_at })
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
