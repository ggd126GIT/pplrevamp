import { getServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/analytics/parse";
import { firstTouch, type Attribution, type TouchRow } from "@/lib/attribution";
import type { Json } from "@/lib/database.types";

/** Hidden field name shared by client + server for honeypot spam detection. */
export const HONEYPOT_FIELD = "company_url";

/** Max length for free-text message fields (contact message, discovery goals). */
export const MAX_MESSAGE_LENGTH = 2000;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when value is a string no longer than max (rejects non-strings). */
export function isWithinLength(value: unknown, max: number): boolean {
  return typeof value === "string" && value.length <= max;
}

export type InquiryType = "contact" | "discovery" | "referral";

/**
 * Resolve where this lead came from, from its session's page views.
 *
 * Best-effort in the strongest sense: any failure returns null and the lead is
 * still written. Losing the source of a lead is a nuisance; losing the lead is
 * not survivable, so nothing here is allowed to throw or block.
 */
async function resolveAttribution(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  sessionId: string | null,
): Promise<Attribution | null> {
  if (!sessionId) return null;
  try {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, source, referrer, utm, country, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error || !data?.length) return null;
    return firstTouch(data as TouchRow[]);
  } catch {
    return null;
  }
}

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

  // Ignore anything malformed: analytics must never block lead capture.
  const session = isUuid(sessionId) ? sessionId : null;

  const { error } = await supabase.from("inquiries").insert({
    type,
    payload: tagged as Json,
    session_id: session,
    attribution: (await resolveAttribution(supabase, session)) as Json,
  });
  if (error) console.error(`[inquiry:${type}] insert failed:`, error.message);
}
