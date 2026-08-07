/**
 * CV retention window.
 *
 * **Two clocks, not one.** The CV file is deleted after 120 days; the row —
 * name, contact, role, outcome — is kept for 2 years, matching what the privacy
 * policy publishes. Deleting the row at 120 days would only ever catch someone
 * reapplying within four months, and repeat or blocked applicants are precisely
 * the people who come back after six or twelve. Delete the file, keep the
 * record.
 *
 * 120 days is *more* protective than the published 2 years, so it promises
 * nothing new to applicants.
 *
 * Pure, so the boundary arithmetic is testable without a database or a route.
 */

/** Agreed with the owner 2026-08-06. */
export const DEFAULT_CV_RETENTION_DAYS = 120;

/**
 * Read the configured window, falling back to the default on anything that is
 * not a positive whole number.
 *
 * The fallback matters more than it looks: a typo'd env var that parsed as 0
 * would set the cutoff to "now" and purge **every** CV on the next run. There
 * is no undo for that, so unparseable input must never widen the window.
 */
export function retentionDays(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value.trim())) return DEFAULT_CV_RETENTION_DAYS;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_CV_RETENTION_DAYS;
}

/** The instant `days` before `now`; applications older than this are in range. */
export function cutoffIso(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
