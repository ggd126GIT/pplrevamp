import { updateInquiryStatus } from "@/app/admin/inquiries/actions";
import { INQUIRY_STATUSES } from "@/lib/inquiryStatus";
import { cn } from "@/lib/cn";

const styles: Record<string, string> = {
  new: "bg-rose-100 text-rose-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-sky-100 text-sky-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-black/[0.06] text-charcoal/60",
};

/** Badge for a lead's follow-up state. `new` is styled loudest on purpose. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? styles.lost,
      )}
    >
      {status}
    </span>
  );
}

/**
 * Move a lead along and leave a note. A plain form posting to a server action,
 * so it works without client JS — the admin is not worth a hydration boundary
 * for one select and one input.
 */
export function InquiryStatusForm({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string | null;
}) {
  return (
    <form
      action={updateInquiryStatus}
      className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-4"
    >
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`status-${id}`}>
        Follow-up status
      </label>
      <select
        id={`status-${id}`}
        name="status"
        // See the note in ApplicationStatus.tsx — same defect, same fix. An
        // uncontrolled select keeps a stale value after revalidatePath, so a
        // subsequent Save silently reverts the lead's status.
        key={status}
        defaultValue={status}
        className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm capitalize"
      >
        {INQUIRY_STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`note-${id}`}>
        Follow-up note
      </label>
      <input
        id={`note-${id}`}
        name="note"
        defaultValue={note ?? ""}
        placeholder="Follow-up note"
        className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"
      >
        Save
      </button>
    </form>
  );
}
