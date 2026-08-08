import { X } from "lucide-react";
import {
  filterHref,
  type ApplicationFilters as Filters,
} from "@/lib/applicationFilter";
import { NO_FILTERS, hasActiveFilters } from "@/lib/applicationFilter";

export type JobOption = { id: string; title: string };

/**
 * Role and date-range filters for `/admin/applications`.
 *
 * A plain GET form, not a client component: the browser turns the fields into
 * the query string this page already reads, so the filtered view is
 * bookmarkable, shareable, survives Back, and needs no JavaScript. It is also
 * the reason the CSV export can inherit the filters for free — they live in the
 * URL, not in component state.
 *
 * Status is deliberately not here; it stays as the tabs above, which are one
 * click rather than a form submit. The hidden field preserves it so applying a
 * date range does not silently clear the status the reader chose.
 */
export function ApplicationFilters({
  filters,
  jobs,
}: {
  filters: Filters;
  jobs: JobOption[];
}) {
  const active = hasActiveFilters(filters);

  return (
    <form
      method="GET"
      action="/admin/applications"
      className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-black/[0.06] bg-white p-4"
    >
      {filters.status && (
        <input type="hidden" name="status" value={filters.status} />
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal/60">Role</span>
        <select
          name="job"
          defaultValue={filters.jobId ?? ""}
          className="min-w-48 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-charcoal"
        >
          <option value="">All roles</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal/60">
          Applied from
        </span>
        <input
          type="date"
          name="from"
          defaultValue={filters.from ?? ""}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-charcoal"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-charcoal/60">to</span>
        <input
          type="date"
          name="to"
          defaultValue={filters.to ?? ""}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-charcoal"
        />
      </label>

      <button
        type="submit"
        className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-ink/90"
      >
        Apply
      </button>

      {active && (
        // A link, not a reset button: reset would restore the values the page
        // loaded with, which are the filters — the opposite of what "clear"
        // means here.
        <a
          href={filterHref(NO_FILTERS)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-charcoal/60 hover:text-purple"
        >
          <X className="size-3.5" /> Clear
        </a>
      )}
    </form>
  );
}
