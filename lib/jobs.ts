/**
 * Expiry is derived, never written back to `status`, so the same predicate has
 * to hold everywhere a job is read: the two careers pages, the sitemap, the
 * admin list, and the apply route.
 */

/** A job with no expiry never expires; otherwise it hides once the instant passes. */
export function isExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  // A timestamptz column cannot produce this, but fail closed if it somehow does.
  if (Number.isNaN(ms)) return true;
  return ms <= now.getTime();
}

/** Whether a job may still receive applications. */
export function acceptsApplications(
  job: { status: string; expires_at: string | null },
  now: Date = new Date(),
): boolean {
  return job.status === "open" && !isExpired(job.expires_at, now);
}

/**
 * PostgREST `.or()` argument matching jobs that have not expired. It mirrors
 * the public RLS policy rather than replacing it — the policy is what actually
 * stops the anon key reading an expired row.
 */
export function notExpiredFilter(now: Date = new Date()): string {
  return `expires_at.is.null,expires_at.gt.${now.toISOString()}`;
}
