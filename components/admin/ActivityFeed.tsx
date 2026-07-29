import { cn } from "@/lib/cn";
import { ACTION_STYLES, timeAgo, type ActivityAction } from "@/lib/activity";

export type ActivityRow = {
  id: string;
  actor_label: string;
  action: string;
  entity_type: string;
  entity_title: string;
  created_at: string;
};

const styleFor = (action: string) =>
  ACTION_STYLES[action as ActivityAction] ?? "bg-black/[0.06] text-charcoal/70";

/**
 * Shared renderer for the activity log — used full-page at /admin/activity and
 * trimmed to the latest few on the dashboard. Entries are historical records,
 * so titles are the snapshot taken at the time and are deliberately not linked:
 * the item they describe may since have been renamed or deleted.
 */
export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 p-4">
          <span
            className={cn(
              "w-24 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold",
              styleFor(row.action),
            )}
          >
            {row.action}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-charcoal/70">
            <span className="font-semibold text-ink">{row.actor_label}</span>
            {" · "}
            {row.entity_type}
            {" · "}
            <span className="text-charcoal/90">{row.entity_title}</span>
          </p>
          <span className="shrink-0 text-xs text-charcoal/50">
            {timeAgo(row.created_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
