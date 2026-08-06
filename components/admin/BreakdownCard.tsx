/**
 * A labelled list of counts — the shape every analytics breakdown panel shares
 * once its caller maps rows to {label, views}.
 *
 * Long lists collapse behind a `<details>` rather than a state toggle, so the
 * card needs no client JavaScript and its hidden rows are still present when
 * scripting fails. See `a0f3f78`, which exists because revealed content that
 * depends on JS can hide forever.
 */

/** Rows always visible; the rest sit behind the toggle. */
const VISIBLE_ROWS = 8;

type Row = { label: string; views: number };

export function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Row[];
}) {
  const visible = rows.slice(0, VISIBLE_ROWS);
  const hidden = rows.slice(VISIBLE_ROWS);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-charcoal/50">No data yet.</p>
      ) : (
        <>
          <dl className="mt-4 space-y-2">
            {visible.map((row) => (
              <BreakdownRow key={row.label} row={row} />
            ))}
          </dl>

          {hidden.length > 0 && (
            <details className="breakdown-more mt-2">
              <summary className="cursor-pointer list-none rounded-lg py-1.5 text-sm font-medium text-purple outline-none hover:underline focus-visible:ring-2 focus-visible:ring-purple/40">
                <span className="breakdown-more-open">
                  Show all {rows.length}
                </span>
                <span className="breakdown-more-close">Show less</span>
              </summary>
              <dl className="mt-2 space-y-2">
                {hidden.map((row) => (
                  <BreakdownRow key={row.label} row={row} />
                ))}
              </dl>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownRow({ row }: { row: Row }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="truncate text-charcoal/70">{row.label}</dt>
      <dd className="shrink-0 font-medium text-ink">{row.views}</dd>
    </div>
  );
}
