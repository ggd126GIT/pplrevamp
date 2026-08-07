import { updateApplicationStatus } from "@/app/admin/applications/actions";
import { APPLICATION_STATUSES } from "@/lib/applicationStatus";
import { cn } from "@/lib/cn";

const styles: Record<string, string> = {
  new: "bg-rose-100 text-rose-700",
  screening: "bg-amber-100 text-amber-700",
  interview: "bg-sky-100 text-sky-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-black/[0.06] text-charcoal/60",
  withdrawn: "bg-black/[0.06] text-charcoal/60",
};

/** Badge for an application's outcome. `new` is styled loudest on purpose. */
export function ApplicationStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? styles.rejected,
      )}
    >
      {status}
    </span>
  );
}

/**
 * Move an application along and leave a note. A plain form posting to a server
 * action, so it works without client JS — same shape as the inquiry control.
 *
 * The note is worth filling in: it is the only context a colleague gets when
 * this person applies again in eight months and the duplicate banner fires.
 */
export function ApplicationStatusForm({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string | null;
}) {
  return (
    <form action={updateApplicationStatus} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`app-status-${id}`}>
        Application status
      </label>
      <select
        id={`app-status-${id}`}
        name="status"
        defaultValue={status}
        className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs capitalize"
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`app-note-${id}`}>
        Outcome note
      </label>
      <input
        id={`app-note-${id}`}
        name="note"
        defaultValue={note ?? ""}
        placeholder="Outcome note"
        className="w-full min-w-0 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white"
      >
        Save
      </button>
    </form>
  );
}
