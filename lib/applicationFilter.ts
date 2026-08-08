/**
 * Filtering for `/admin/applications` — and, because the export inherits it,
 * for the CSV too.
 *
 * One filter model rather than two. A separate set of export-only filters would
 * mean you could never see what you were about to export, and every filter
 * would have to be implemented twice.
 *
 * Pure so it is testable: the page is a server component and vitest here runs
 * `environment: "node"` collecting only `**\/*.test.ts`.
 */
import {
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/applicationStatus";
import { isRealDate } from "@/lib/dates";

const BASE = "/admin/applications";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApplicationFilters = {
  status: ApplicationStatus | null;
  /** Job id, so the label can be renamed without breaking saved links. */
  jobId: string | null;
  /** Inclusive lower bound, yyyy-mm-dd as typed. Manila day. */
  from: string | null;
  /** Inclusive upper bound, yyyy-mm-dd as typed. Manila day. */
  to: string | null;
};

export const NO_FILTERS: ApplicationFilters = {
  status: null,
  jobId: null,
  from: null,
  to: null,
};

export type RawParams = {
  status?: string;
  job?: string;
  from?: string;
  to?: string;
};

/**
 * A query string is user input.
 *
 * Every unrecognised value degrades to "no filter" rather than to an error or
 * an empty result. An empty table is indistinguishable from "there are no
 * applications", which is the wrong thing to tell someone — and on the export
 * it would be worse: a file that is empty for a reason nobody can see.
 */
export function parseStatusFilter(
  value: string | undefined,
): ApplicationStatus | null {
  return isApplicationStatus(value) ? value : null;
}

/**
 * Shape *and* validity. The regex alone accepts 2026-13-01 and 2026-02-30,
 * which would then be dropped silently further down while the input still
 * displayed them — a filter that appears set but is not.
 */
function parseDate(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return DATE.test(trimmed) && isRealDate(trimmed) ? trimmed : null;
}

function parseJobId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return UUID.test(trimmed) ? trimmed : null;
}

export function parseFilters(params: RawParams): ApplicationFilters {
  const from = parseDate(params.from);
  const to = parseDate(params.to);

  // A backwards range is a typo, not an intent to see nothing. Swapping is the
  // reading that returns what the person obviously meant; the inputs then show
  // the corrected order back to them, so it is visible rather than magic.
  const swap = from && to && from > to;

  return {
    status: parseStatusFilter(params.status),
    jobId: parseJobId(params.job),
    from: swap ? to : from,
    to: swap ? from : to,
  };
}

export function hasActiveFilters(f: ApplicationFilters): boolean {
  return !!(f.status || f.jobId || f.from || f.to);
}

/**
 * The filters as a query string, with optional overrides.
 *
 * Overrides are how the status tabs change one facet without discarding the
 * rest — switching to "rejected" must not silently clear the date range the
 * reader just set.
 */
export function filtersToQuery(
  f: ApplicationFilters,
  overrides: Partial<ApplicationFilters> = {},
): string {
  const merged = { ...f, ...overrides };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.jobId) params.set("job", merged.jobId);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  return params.toString();
}

/**
 * Link to the filtered table. The page number is deliberately dropped: page 3
 * of everything is rarely page 3 of a narrower set, and keeping it would land
 * the reader past the end.
 */
export function filterHref(
  f: ApplicationFilters,
  overrides: Partial<ApplicationFilters> = {},
): string {
  const query = filtersToQuery(f, overrides);
  return query ? `${BASE}?${query}` : BASE;
}

/**
 * Link for the CSV export, carrying exactly the filters on screen. No page
 * number: the export returns every matching row, not the fifteen displayed.
 */
export function exportHref(f: ApplicationFilters): string {
  const query = filtersToQuery(f);
  return query ? `${BASE}/export?${query}` : `${BASE}/export`;
}
