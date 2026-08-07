/**
 * Recruitment outcome for one application.
 *
 * Kept out of `app/admin/applications/actions.ts` because a `"use server"`
 * module may export **only async functions** — a const array or a type guard
 * there fails the build, and tsc will not warn you (it is a Next constraint,
 * not a type error). Same reason as `lib/inquiryStatus.ts`.
 *
 * These values must stay identical to `applications_status_check`. A value the
 * constraint rejects fails *silently*: the action logs the error and returns,
 * so the editor just sees the old value reappear.
 *
 * DigiOffice remains the full recruitment record. This stores only enough
 * outcome to answer "has this person been rejected before?" when a new
 * application lands.
 */
export const APPLICATION_STATUSES = [
  "new",
  "screening",
  "interview",
  "rejected",
  "hired",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isApplicationStatus(v: unknown): v is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(v as string);
}
