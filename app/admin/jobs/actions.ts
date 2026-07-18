"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { textToDoc } from "@/lib/tiptap";

export type JobFormState = { error?: string } | undefined;

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const workModeRaw = String(formData.get("work_mode") ?? "").trim();
  const work_mode = ["onsite", "wfh", "hybrid"].includes(workModeRaw)
    ? workModeRaw
    : null;
  const status =
    String(formData.get("status") ?? "open") === "closed" ? "closed" : "open";
  const description = textToDoc(String(formData.get("description") ?? ""));
  const slug = slugify(slugInput || title);
  return { title, slug, department, location, work_mode, status, description };
}

export async function createJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert(data);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  revalidatePath("/careers");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function updateJob(
  id: string,
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update(data).eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  revalidatePath("/careers");
  revalidatePath(`/careers/${data.slug}`);
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function deleteJob(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("jobs").delete().eq("id", id);
  revalidatePath("/careers");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}
