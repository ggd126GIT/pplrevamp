"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { deriveAction, logActivity } from "@/lib/activity";
import { manilaDateTime, manilaEndOfDay } from "@/lib/dates";
import { EMPLOYMENT_TYPES } from "@/lib/jobs";
import type { Json } from "@/lib/database.types";

export type JobFormState = { error?: string } | undefined;

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] } as unknown as Json;

/** The editor posts its document as JSON; fall back to empty rather than throwing. */
function parseDoc(raw: string): Json {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Json;
  } catch {
    // A malformed body should not 500 the whole save.
  }
  return EMPTY_DOC;
}

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const short_description =
    String(formData.get("short_description") ?? "").trim() || null;
  const workModeRaw = String(formData.get("work_mode") ?? "").trim();
  const work_mode = ["onsite", "wfh", "hybrid"].includes(workModeRaw)
    ? workModeRaw
    : null;
  const status =
    String(formData.get("status") ?? "open") === "closed" ? "closed" : "open";
  const description = parseDoc(String(formData.get("description") ?? ""));
  const slug = slugify(slugInput || title);
  // null = cleared, undefined = malformed. The callers reject undefined so a
  // typo never silently wipes an expiry date.
  const expires_at = manilaEndOfDay(String(formData.get("expires_at") ?? ""));
  // Same three-way contract. Blank means "use the row's creation time".
  const posted_at = manilaDateTime(String(formData.get("posted_at") ?? ""));
  const employmentRaw = String(formData.get("employment_type") ?? "").trim();
  const employment_type = (
    EMPLOYMENT_TYPES as readonly string[]
  ).includes(employmentRaw)
    ? employmentRaw
    : null;
  return {
    title,
    slug,
    department,
    location,
    short_description,
    work_mode,
    status,
    description,
    expires_at,
    posted_at,
    employment_type,
  };
}

export async function createJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };
  if (data.expires_at === undefined)
    return { error: "Enter a valid expiry date." };
  if (data.posted_at === undefined)
    return { error: "Enter a valid posted date and time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  const { data: created, error } = await supabase
    .from("jobs")
    .insert({ ...data, created_by: actorId, updated_by: actorId })
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

  await logActivity(supabase, {
    action: "created",
    entityType: "job",
    entityId: created?.id ?? null,
    entityTitle: data.title,
    actorId,
  });

  revalidatePath("/careers");
  revalidatePath("/admin/jobs");
  // Land on the new role's editor, not the list: preview only exists once a row
  // does, so this is what puts "check it before it goes live" one click from
  // saving. Falls back to the list if the insert somehow returned no id.
  redirect(created?.id ? `/admin/jobs/${created.id}` : "/admin/jobs");
}

export async function updateJob(
  id: string,
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };
  if (!data.slug) return { error: "A valid slug is required." };
  if (data.expires_at === undefined)
    return { error: "Enter a valid expiry date." };
  if (data.posted_at === undefined)
    return { error: "Enter a valid posted date and time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  const { data: existing } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("jobs")
    .update({ ...data, updated_by: actorId })
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose a different one."
          : error.message,
    };
  }

  await logActivity(supabase, {
    action: deriveAction("job", existing?.status, data.status),
    entityType: "job",
    entityId: id,
    entityTitle: data.title,
    actorId,
  });

  revalidatePath("/careers");
  revalidatePath(`/careers/${data.slug}`);
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function deleteJob(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Capture the title before the row disappears.
  const { data: existing } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (!error) {
    await logActivity(supabase, {
      action: "deleted",
      entityType: "job",
      entityId: id,
      entityTitle: existing?.title ?? "(untitled job)",
      actorId: user?.id ?? null,
    });
  }

  revalidatePath("/careers");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}
