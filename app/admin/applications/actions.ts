"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity";
import { isApplicationStatus } from "@/lib/applicationStatus";

export type DeleteCvState = { error?: string; ok?: boolean } | undefined;

/**
 * Record where an applicant got to. Staff hold UPDATE on exactly six columns
 * (see `applications_staff_update_policy_and_grants`), so a stray field here
 * would be refused rather than silently written — the name, email, phone and
 * job the applicant submitted are not ours to rewrite.
 */
export async function updateApplicationStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id || !isApplicationStatus(status)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      status_note: note,
      status_updated_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);

  if (error) {
    console.error("[applications] status update failed:", error.message);
    return;
  }

  // Not written to the activity log, matching the inquiry status control:
  // `reviewed_by` and `status_updated_at` already record who and when, and the
  // log is for content changes.
  revalidatePath("/admin/applications");
}

/**
 * Blacklist a person, by email.
 *
 * Keyed on `email_key`, not on an application id — the block follows the
 * person across every future application, which is the entire point.
 *
 * The reason is **required and stored verbatim**. The DPA gives an applicant
 * the right to request what is held about them, so every entry has to be a
 * fact that survives being read back to them. "No-show for two scheduled
 * interviews" qualifies; "difficult" does not. Enforced in the database too
 * (`reason NOT NULL`), so this check is the friendly half, not the only one.
 */
export async function blockApplicant(formData: FormData) {
  const emailKey = String(formData.get("emailKey") ?? "").trim().toLowerCase();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!emailKey || !reason) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("applicant_blocks")
    .upsert(
      { email_key: emailKey, reason, created_by: user.id },
      { onConflict: "email_key" },
    );

  if (error) {
    console.error("[applications] block failed:", error.message);
    return;
  }

  revalidatePath("/admin/applications");
}

/** Lift a block. The applications themselves are untouched. */
export async function unblockApplicant(formData: FormData) {
  const emailKey = String(formData.get("emailKey") ?? "").trim().toLowerCase();
  if (!emailKey) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("applicant_blocks")
    .delete()
    .eq("email_key", emailKey);

  if (error) {
    console.error("[applications] unblock failed:", error.message);
    return;
  }

  revalidatePath("/admin/applications");
}

/**
 * Remove an applicant's CV file while keeping the record.
 *
 * Order matters: the storage object goes first, the reference second. If the
 * object delete fails we keep `cv_url`, so the file stays findable and the
 * action can be retried. Clearing the reference first would leave the PDF in the
 * bucket with nothing pointing at it — invisible in the admin, still held, still
 * personal data. That looks like success and is the worst outcome available.
 */
export async function deleteCv(
  _prev: DeleteCvState,
  formData: FormData,
): Promise<DeleteCvState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing application id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: app, error: readErr } = await supabase
    .from("applications")
    .select("id, first_name, last_name, cv_url, cv_deleted_at")
    .eq("id", id)
    .single();

  if (readErr || !app) return { error: "Application not found." };
  if (!app.cv_url) {
    // Already gone. Not an error worth showing — the outcome the user wanted
    // is the outcome they have.
    return { ok: true };
  }

  // The `cvs` bucket is private and staff hold no delete grant on it, so the
  // removal runs through the service role.
  const service = getServiceClient();
  if (!service) return { error: "Storage is not configured." };

  const { error: storageErr } = await service.storage
    .from("cvs")
    .remove([app.cv_url]);

  if (storageErr) {
    console.error("[applications] CV storage delete failed:", storageErr.message);
    return { error: "Could not delete the file. Nothing was changed." };
  }

  const { error: updateErr } = await supabase
    .from("applications")
    .update({ cv_url: null, cv_deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    // The file is already gone, so surface this loudly rather than reporting
    // success: the row would otherwise point at an object that no longer exists.
    console.error("[applications] CV reference clear failed:", updateErr.message);
    return {
      error:
        "The file was deleted but the record could not be updated. Please refresh.",
    };
  }

  await logActivity(supabase, {
    action: "deleted",
    entityType: "application",
    entityId: id,
    entityTitle: `CV — ${app.first_name} ${app.last_name}`,
    actorId: user.id,
  });

  revalidatePath("/admin/applications");
  return { ok: true };
}
