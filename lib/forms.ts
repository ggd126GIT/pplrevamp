import { getServiceClient } from "@/lib/supabase/server";

/** Hidden field name shared by client + server for honeypot spam detection. */
export const HONEYPOT_FIELD = "company_url";

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type InquiryType = "contact" | "discovery" | "referral";

/** Best-effort persistence to the inquiries table; never throws. */
export async function persistInquiry(
  type: InquiryType,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.warn(`[inquiry:${type}] skipped persistence (Supabase not configured)`);
    return;
  }
  const { error } = await supabase.from("inquiries").insert({ type, payload });
  if (error) console.error(`[inquiry:${type}] insert failed:`, error.message);
}
