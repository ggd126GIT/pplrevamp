import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  getAnalyticsSummary,
  getSectionReach,
  getGeoSummary,
  reachRows,
  type GeoSummary,
} from "@/lib/analytics/queries";
import { placeLabel } from "@/lib/analytics/format";
import { SECTION_REGISTRY } from "@/lib/analytics/sections";
import { ViewsChart } from "@/components/admin/ViewsChart";
import { SectionReachCard } from "@/components/admin/SectionReachCard";

const RANGES = [7, 30, 90];

/**
 * Both breakdown tables share a shape once the caller maps its rows to
 * {label, views} — avoids indexing a union row type by a variable key.
 */
function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; views: number }>;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-charcoal/50">No data yet.</p>
      ) : (
        <dl className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-sm">
              <dt className="truncate text-charcoal/70">{row.label}</dt>
              <dd className="shrink-0 font-medium text-ink">{row.views}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function LocationCards({
  countries,
  cities,
}: {
  countries: GeoSummary["countries"];
  cities: GeoSummary["cities"];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <BreakdownCard
        title="Top countries"
        rows={countries.map((c) => ({
          label: c.country,
          views: c.views,
        }))}
      />
      <BreakdownCard
        title="Top cities"
        rows={cities.map((c) => ({
          label: placeLabel(c.city, c.country),
          views: c.views,
        }))}
      />
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = RANGES.includes(Number(raw)) ? Number(raw) : 30;
  const [summary, reach, geo] = await Promise.all([
    getAnalyticsSummary(days),
    getSectionReach(days),
    getGeoSummary(days),
  ]);

  if (!summary) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          Analytics are unavailable right now.
        </p>
      </div>
    );
  }

  const tiles = [
    { label: "Page views", value: summary.views.toLocaleString() },
    { label: "Visitors", value: summary.visitors.toLocaleString() },
    { label: "Top source", value: summary.top_sources[0]?.source ?? "—" },
    { label: "Top page", value: summary.top_pages[0]?.path ?? "—" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="mt-1 text-charcoal/60">
            Last {days} days. Staff and staging traffic excluded.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                r === days
                  ? "bg-purple text-white"
                  : "text-charcoal/60 hover:text-purple",
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl border border-black/[0.06] bg-white p-6"
          >
            <p className="truncate font-display text-2xl font-extrabold text-ink">
              {t.value}
            </p>
            <p className="text-sm text-charcoal/60">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-6">
        <h2 className="text-sm font-semibold text-ink">Views per day</h2>
        <div className="mt-4">
          <ViewsChart data={summary.daily} />
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <BreakdownCard
          title="Top pages"
          rows={summary.top_pages.map((r) => ({ label: r.path, views: r.views }))}
        />
        <BreakdownCard
          title="Top sources"
          rows={summary.top_sources.map((r) => ({
            label: r.source,
            views: r.views,
          }))}
        />
      </div>

      {reach && (
        <>
          <h2 className="mt-12 text-lg font-semibold text-ink">Section reach</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Share of visits to each page that scrolled far enough to see the section.
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {Object.entries(SECTION_REGISTRY).map(([path, defs]) => {
              const sessions =
                reach.sessions.find((s) => s.path === path)?.sessions ?? 0;
              const reached = new Map(
                reach.sections
                  .filter((s) => s.path === path)
                  .map((s) => [s.label, s.reached]),
              );
              return (
                <SectionReachCard
                  key={path}
                  path={path}
                  sessions={sessions}
                  rows={reachRows(defs, sessions, reached)}
                />
              );
            })}
          </div>

          <div className="mt-8">
            <BreakdownCard
              title="Clicks"
              rows={reach.clicks.map((c) => ({
                label: c.label,
                views: c.clicks,
              }))}
            />
          </div>
        </>
      )}

      {geo && (
        <>
          <h2 className="mt-12 text-lg font-semibold text-ink">Top locations</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Where views came from. Unknown = no location resolved.
          </p>
          <div className="mt-5">
            <LocationCards countries={geo.countries} cities={geo.cities} />
          </div>

          <h2 className="mt-12 text-lg font-semibold text-ink">
            Services — top locations
          </h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Where views of the services page came from.
          </p>
          <div className="mt-5">
            <LocationCards
              countries={geo.services_countries}
              cities={geo.services_cities}
            />
          </div>
        </>
      )}
    </div>
  );
}
