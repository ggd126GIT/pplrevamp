import { funnelStages, biggestDrop, type LeadFunnel } from "@/lib/analytics/funnel";

/**
 * The lead funnel: how many visits turn into enquiries, and where they are lost.
 *
 * Bars are sized against total sessions rather than the previous stage, so the
 * shape of the fall is visible at a glance instead of every stage looking
 * healthy relative to the one before it.
 */
export function FunnelCard({ funnel }: { funnel: LeadFunnel }) {
  const stages = funnelStages(funnel.total);
  const drop = biggestDrop(funnel.total);
  const sources = funnel.by_source.filter((s) => s.reached > 0);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <h2 className="text-sm font-semibold text-ink">Lead funnel</h2>
      <p className="mt-1 text-sm text-charcoal/60">
        {funnel.total.submitted > 0 ? (
          <>
            {funnel.total.submitted} of {funnel.total.sessions} visits became an
            enquiry.
          </>
        ) : (
          <>
            No enquiries yet from {funnel.total.sessions} visits.
            {drop && (
              <>
                {" "}
                The biggest fall is {drop.from} → {drop.to} ({drop.lost} lost).
              </>
            )}
          </>
        )}
      </p>

      <ol className="mt-5 space-y-3">
        {stages.map((s) => (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium text-ink">{s.label}</span>
              <span className="shrink-0 tabular-nums text-charcoal/70">
                {s.count}
                {s.pctOfPrev !== null && (
                  <span className="ml-2 text-xs text-charcoal/50">
                    {s.pctOfPrev}% of previous
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-purple"
                style={{ width: `${s.pctOfSessions}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-charcoal/50">{s.hint}</p>
          </li>
        ))}
      </ol>

      {sources.length > 0 && (
        <div className="mt-6 border-t border-black/[0.06] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Sources that reached the contact page
          </h3>
          <dl className="mt-3 space-y-2">
            {sources.map((s) => (
              <div
                key={s.source}
                className="flex justify-between gap-4 text-sm"
              >
                <dt className="truncate text-charcoal/70">{s.source}</dt>
                <dd className="shrink-0 tabular-nums text-ink">
                  {s.reached}
                  <span className="text-charcoal/50"> / {s.sessions}</span>
                  {s.submitted > 0 && (
                    <span className="ml-2 font-medium text-purple">
                      {s.submitted} lead{s.submitted === 1 ? "" : "s"}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
