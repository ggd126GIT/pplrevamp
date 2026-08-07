/**
 * Status filtering for `/admin/applications` — "show me everyone rejected" in
 * one click.
 *
 * Pure so it is testable: the page itself is a server component and vitest here
 * runs `environment: "node"` collecting only `**\/*.test.ts`.
 */
import {
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/applicationStatus";

const BASE = "/admin/applications";

/**
 * A query string is user input. Anything unrecognised means *no filter* rather
 * than an error or an empty result — an empty table is indistinguishable from
 * "there are no applications", which is the wrong thing to tell someone.
 */
export function parseStatusFilter(
  value: string | undefined,
): ApplicationStatus | null {
  return isApplicationStatus(value) ? value : null;
}

/**
 * Link for a filter tab. The page number is deliberately dropped: page 3 of
 * everything is rarely page 3 of one status, and keeping it would land the
 * reader past the end of the filtered set.
 */
export function filterHref(status: ApplicationStatus | null): string {
  return status ? `${BASE}?status=${status}` : BASE;
}
