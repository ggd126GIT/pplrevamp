import { getServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/analytics/parse";
import type { Json } from "@/lib/database.types";

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
  sessionId?: string | null,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.warn(`[inquiry:${type}] skipped persistence (Supabase not configured)`);
    return;
  }
  // Staging shares the production database, so mark test rows to make them
  // separable at cutover. Unset in production, so real rows carry no flag.
  const tagged = process.env.STAGING_PASSWORD
    ? { ...payload, _staging: true }
    : payload;

  const { error } = await supabase.from("inquiries").insert({
    type,
    payload: tagged as Json,
    // Ignore anything malformed: analytics must never block lead capture.
    session_id: isUuid(sessionId) ? sessionId : null,
  });
  if (error) console.error(`[inquiry:${type}] insert failed:`, error.message);
}
