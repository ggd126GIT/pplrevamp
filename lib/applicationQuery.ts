/**
 * Turns the filter model into database predicates.
 *
 * Shared by the table and the CSV export on purpose. If each built its own
 * `where` clause they would eventually disagree, and the failure mode is a file
 * that quietly contains different rows than the screen it was exported from —
 * which nobody would notice until it mattered.
 *
 * Structurally typed rather than importing Postgrest's builder generics: the
 * two call sites select different columns, and this only needs the three
 * methods.
 */
import type { ApplicationFilters } from "@/lib/applicationFilter";
import { manilaEndOfDay, manilaStartOfDay } from "@/lib/dates";

type Filterable<T> = {
  eq(column: string, value: string): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
};

export function applyApplicationFilters<T extends Filterable<T>>(
  query: T,
  filters: ApplicationFilters,
): T {
  let next = query;

  if (filters.status) next = next.eq("status", filters.status);
  if (filters.jobId) next = next.eq("job_id", filters.jobId);

  // Both bounds are inclusive Manila days. `manilaStartOfDay` /
  // `manilaEndOfDay` return undefined for a malformed date, which is skipped
  // rather than passed to the database — though `parseFilters` has already
  // dropped anything that is not yyyy-mm-dd, so this is the second lock.
  if (filters.from) {
    const start = manilaStartOfDay(filters.from);
    if (start) next = next.gte("created_at", start);
  }
  if (filters.to) {
    const end = manilaEndOfDay(filters.to);
    if (end) next = next.lte("created_at", end);
  }

  return next;
}
