/**
 * Expiry is derived, never written back to `status`, so the same predicate has
 * to hold everywhere a job is read: the two careers pages, the sitemap, the
 * admin list, and the apply route.
 */

/**
 * schema.org's JobPosting employmentType vocabulary, stored verbatim so the
 * structured data needs no mapping layer.
 *
 * Must stay in step with the `jobs_employment_type_check` constraint — a value
 * this list allows and the constraint does not fails the entire save.
 *
 * Lives here rather than beside the server action because a `"use server"`
 * module may only export async functions.
 */
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "TEMPORARY",
  "INTERN",
  "VOLUNTEER",
  "PER_DIEM",
  "OTHER",
] as const;

/** Reader-facing names for those values, used by the admin form and the job page. */
export const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
  INTERN: "Internship",
  VOLUNTEER: "Volunteer",
  PER_DIEM: "Per diem",
  OTHER: "Other",
};

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
 * The date a role was posted, as shown to readers and given to Google.
 *
 * `posted_at` is what an editor set; `created_at` is when the row happened to be
 * saved. Every reader of a posted date must resolve them the same way or the
 * page and its structured data disagree about the same role.
 */
export function postedAt(job: {
  posted_at: string | null;
  created_at: string | null;
}): string | null {
  return job.posted_at ?? job.created_at;
}

/**
 * PostgREST `.or()` argument matching jobs that have not expired. It mirrors
 * the public RLS policy rather than replacing it — the policy is what actually
 * stops the anon key reading an expired row.
 */
export function notExpiredFilter(now: Date = new Date()): string {
  return `expires_at.is.null,expires_at.gt.${now.toISOString()}`;
}
