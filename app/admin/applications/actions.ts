"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity";

export type DeleteCvState = { error?: string; ok?: boolean } | undefined;

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
