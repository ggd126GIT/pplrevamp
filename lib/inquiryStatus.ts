/**
 * Lead follow-up states.
 *
 * Kept out of `app/admin/inquiries/actions.ts` because a `"use server"` module
 * may export **only async functions** — a const array or a type guard there
 * fails the build (and tsc will not warn you, since it is a Next constraint,
 * not a type error).
 */
export const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export function isInquiryStatus(v: unknown): v is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(v as string);
}
