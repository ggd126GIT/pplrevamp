import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { getJourneys } from "@/lib/analytics/queries";
import { JourneyStrip } from "@/components/admin/JourneyStrip";
import { ExpandableText } from "@/components/admin/ExpandableText";
import { Pagination } from "@/components/admin/Pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";
import { summariseLeads, topSources } from "@/lib/leadSummary";
import { SourceLine } from "@/components/admin/SourceLine";
import {
  InquiryStatusForm,
  StatusBadge,
} from "@/components/admin/InquiryStatus";

const typeStyles: Record<string, string> = {
  contact: "bg-purple/10 text-purple",
  discovery: "bg-amber-100 text-amber-700",
  referral: "bg-emerald-100 text-emerald-700",
};

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const { data: inquiries, count } = await supabase
    .from("inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  // Summary is over every lead, not the current page — "3 unanswered" must not
  // silently mean "3 unanswered among the 15 you happen to be looking at".
  const { data: allLeads } = await supabase
    .from("inquiries")
    .select("status, attribution");
  const summary = summariseLeads(allLeads ?? []);
  const sources = topSources(allLeads ?? []);

  const sessionIds = (inquiries ?? [])
    .map((i) => i.session_id)
    .filter((id): id is string => Boolean(id));
  const journeys = await getJourneys(sessionIds);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Inquiries</h1>
      <p className="mt-1 text-charcoal/60">
        Contact and discovery submissions.
      </p>

      {/* One sentence, not a chart wall: at this volume the useful output is
          something readable in two seconds — how many, from where, and how many
          nobody has picked up. Counts are over ALL leads, not this page. */}
      <p className="mt-5 rounded-2xl border border-black/[0.06] bg-mist px-5 py-4 text-sm text-charcoal">
        <span className="font-semibold text-ink">{summary.total}</span> lead
        {summary.total === 1 ? "" : "s"} all-time
        {sources.length > 0 && (
          <>
            {" "}
            — from{" "}
            {sources.map((s, i) => (
              <span key={s.source}>
                {i > 0 && ", "}
                <span className="font-semibold text-ink">{s.source}</span> (
                {s.count})
              </span>
            ))}
          </>
        )}
        .{" "}
        {summary.unanswered > 0 ? (
          <span className="font-semibold text-rose-700">
            {summary.unanswered} still unanswered.
          </span>
        ) : (
          <span className="font-semibold text-emerald-700">
            Nothing unanswered.
          </span>
        )}
      </p>

      {!inquiries?.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          No inquiries yet.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {inquiries.map((inq) => {
            const payload = (inq.payload ?? {}) as Record<string, unknown>;
            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-black/[0.06] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      typeStyles[inq.type] ?? "bg-black/5 text-charcoal",
                    )}
                  >
                    {inq.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inq.status} />
                    <time className="text-xs text-charcoal/50">
                      {inq.created_at
                        ? new Date(inq.created_at).toLocaleString()
                        : ""}
                    </time>
                  </div>
                </div>

                <SourceLine attribution={inq.attribution} />
                <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {Object.entries(payload)
                    // Underscore-prefixed keys are internal bookkeeping
                    // (e.g. _staging), not submitted answers.
                    .filter(([k]) => !k.startsWith("_"))
                    .filter(([, v]) => v !== null && v !== "" && v !== undefined)
                    .map(([k, v]) => {
                      const text = String(v);
                      // Long free-text (message/goals) spans the full width and
                      // collapses to a snippet so it can't blow out the card.
                      const isLong = text.length > 120;
                      return (
                        <div
                          key={k}
                          className={cn("text-sm", isLong && "sm:col-span-2")}
                        >
                          <dt className="text-charcoal/50">{humanize(k)}</dt>
                          <dd className="text-ink">
                            <ExpandableText text={text} />
                          </dd>
                        </div>
                      );
                    })}
                </dl>
                {inq.session_id && (
                  <JourneyStrip steps={journeys.get(inq.session_id) ?? []} />
                )}
                <InquiryStatusForm
                  id={inq.id}
                  status={inq.status}
                  note={inq.note}
                />
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageCount={pageCount(count)}
        basePath="/admin/inquiries"
      />
    </div>
  );
}
