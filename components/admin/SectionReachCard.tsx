import type { ReachRow } from "@/lib/analytics/queries";

export function SectionReachCard({
  path,
  sessions,
  rows,
}: {
  path: string;
  sessions: number;
  rows: ReachRow[];
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">{path}</h2>
        <p className="shrink-0 text-xs text-charcoal/50">
          {sessions.toLocaleString()} {sessions === 1 ? "visit" : "visits"}
        </p>
      </div>

      {!sessions ? (
        <p className="mt-4 text-sm text-charcoal/50">No data yet.</p>
      ) : (
        <dl className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="truncate text-charcoal/70">{row.label}</dt>
                <dd className="shrink-0 font-medium text-ink">{row.pct}%</dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-grad-from to-grad-to"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
