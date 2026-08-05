"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInquiryStatus } from "@/lib/inquiryStatus";

/**
 * Move a lead along, and record who did it.
 *
 * The check constraint on the column would reject a bad value anyway, but
 * validating here turns a 500 into a no-op — a mistyped status must not cost
 * the note typed alongside it.
 */
export async function updateInquiryStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id || !isInquiryStatus(status)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("inquiries")
    .update({
      status,
      note,
      owner_id: user?.id ?? null,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[inquiry] status update failed:", error.message);
    return;
  }

  // Not written to the activity log: ActivityEntity is "post" | "job", and
  // widening it would ripple into the activity page's filters and labels for
  // no gain here — owner_id and status_updated_at already record who and when.

  revalidatePath("/admin/inquiries");
}
