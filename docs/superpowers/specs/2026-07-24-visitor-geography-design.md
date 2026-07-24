# Visitor Geography — Country + City Capture and Surfacing

**Date:** 2026-07-24
**Status:** Approved, ready for implementation
**Builds on:** `2026-07-22-first-party-analytics-design.md`, `2026-07-23-interaction-events-design.md`

## Goal

Answer a question the current analytics cannot: **where are visitors — especially prospective
clients — accessing the site from?**

`page_views` already stores a two-letter `country`, but nothing displays it, and there is no
finer resolution. The business need is concrete: prospective clients evaluate the site from
abroad during a sales cycle, and the team wants to recognise that activity — both in aggregate
("inbound interest is coming from Australia and the US") and per-lead ("this inquiry is the
Sydney client we pitched"). Country alone is too coarse to tell two clients in the same country
apart; **city** is the level that makes a specific visit recognisable.

Three surfaces were named as the ones that matter: the **inquiries** view, the **overall
analytics**, and specifically **who views the services page and from where**.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Granularity | Country + city (region captured, not surfaced) | City is what makes a specific client's visit recognisable. Region is cheap to capture alongside and may surface later; no lat/long — not needed and more identifying. |
| Where location lives | A property of the **session**, stored on `page_views` | One IP resolves to one place for a whole visit. Capturing once on `page_views` lets every surface that already knows sessions (inquiries journey, analytics) read it for free. No `events` change. |
| Aggregation | One new `geo_summary(days)` function | Isolates all geo aggregation; leaves `analytics_summary()` and `section_reach()` untouched, so existing counts cannot be disturbed. |
| Services breakdown | `/services` hard-coded in `geo_summary` | The one page explicitly asked for. Generalising to an arbitrary path is a later change, not built now (YAGNI). |
| Country display | Flag emoji + ISO code (🇵🇭 PH) | Derived from the two-letter code with two lines of arithmetic — no 250-entry name lookup table. |

## Precision depends on the deploy target

This must be recorded because it is a real constraint, not an implementation detail:

- **Vercel** (current host) exposes `x-vercel-ip-city` and `x-vercel-ip-country-region` at the
  edge for free. City works the day this ships.
- A **VPS** behind Cloudflare's free tier gives **country only** — no city — unless a MaxMind
  GeoIP database is added to Nginx (which can emit the `x-geoip-*` headers this design already
  reads).
- Therefore committing to city-level analytics leans the still-open deploy decision toward
  **staying on Vercel**, or accepting extra GeoIP work on the VPS. City degrades to `null`
  ("Unknown") wherever no edge resolves it — including local dev — never an error.

This updates `PRE-LAUNCH-CHECKLIST.md` §4, which currently discusses only country headers.

## Privacy

This is a **deliberate step past** the current posture and must be acknowledged, not waved
through. Today's analytics is cookieless, stores no IP, and needs no consent banner. City-level
location — especially once joined to a named inquiry — lets the team associate a person with a
place. For B2B lead intelligence that is a normal and defensible use, but the privacy policy
must say so honestly.

**Change:** one sentence added to the privacy policy, to the effect of: *"We record an
approximate location (country and city) derived from your IP address at the network edge; we do
not store your IP address."* No consent banner is still required — the location is derived and
discarded-at-source, not stored as an identifier, and no third party receives it. The IP itself
is never persisted, matching the existing `page_views` guarantee.

## Schema

Two nullable columns added to the existing table:

```sql
alter table public.page_views add column region text;
alter table public.page_views add column city text;
```

No index is added: geo is filtered and grouped inside `geo_summary` over the same
time-and-staging-scoped window the other summary functions already scan, and the row counts
(~60k/year) do not justify one. `events` is unchanged. Existing rows keep `null` for the new
columns, which render as "Unknown" — correct, not a defect.

Types are regenerated from the live schema (`lib/database.types.ts`) after the migration.

## Capture — `lib/analytics/parse.ts`

`countryFromHeaders()` generalises to `geoFromHeaders(headers): Geo`, where:

```ts
type Geo = { country: string | null; region: string | null; city: string | null };
```

- **country** — unchanged logic: `x-vercel-ip-country` → `cf-ipcountry` → `x-geoip-country`,
  uppercased, must match `^[A-Z]{2}$`, rejecting `XX` (anonymised) and `T1` (Tor).
- **region** — `x-vercel-ip-country-region` → `x-geoip-region`. Trimmed, length-capped, nullable.
- **city** — `x-vercel-ip-city` → `cf-ipcity` → `x-geoip-city`. **URL-decoded** (Vercel sends
  `San%20Francisco`), trimmed, length-capped at 128, empty → `null`. Decoding is wrapped so a
  malformed value yields `null` rather than throwing.

The function stays pure — no I/O, no Next imports — and is unit-tested alongside the existing
parsers. `countryFromHeaders` is removed; its one caller (`/api/track`) moves to `geoFromHeaders`.

`app/api/track/route.ts` replaces the single `country:` line with the three derived fields:

```ts
const geo = geoFromHeaders(request.headers);
// ...insert: country: geo.country, region: geo.region, city: geo.city
```

IP and raw user-agent remain unpersisted, exactly as today.

## Aggregation — `geo_summary(days)` + query layer

A new SQL function beside `analytics_summary` and `section_reach`, **SECURITY INVOKER** like
its siblings — RLS is what keeps analytics staff-only. It returns a single JSON object:

```json
{
  "countries":         [{ "country": "PH", "views": 128 }],
  "cities":            [{ "city": "Makati", "country": "PH", "views": 40 }],
  "services_countries":[{ "country": "AU", "views": 12 }],
  "services_cities":   [{ "city": "Sydney", "country": "AU", "views": 7 }]
}
```

- All four lists scope to `is_staging = false` and the `days` window, matching the other
  functions.
- `countries` / `cities` cover all traffic; `services_*` add `and path = '/services'`.
- `country` coalesces `null → 'Unknown'`; a `city` row keeps its `country` so the display can
  render "Makati, PH" and disambiguate same-named cities.
- Each list ordered by views desc, tie-broken by name, limited (10 for countries, 20 for cities).

`lib/analytics/queries.ts` gains `getGeoSummary(days): Promise<GeoSummary | null>`, mirroring
`getSectionReach` — try/catch, logs, returns `null` so a failed geo read degrades one panel
instead of 500ing `/admin`. Exported type `GeoSummary` matches the JSON above.

**Journey location:** `getJourneys()`'s `select` extends to include `country` and `city`. Since
location is constant across a session's rows, the `JourneyStep` type gains `country`/`city` and
the strip reads them off the first step — the same way it already derives `source`.

## Admin surfacing — `/admin/analytics`

Two additions, both fed by `getGeoSummary(days)` fetched in the existing `Promise.all`:

1. **Top locations** — a section with two `BreakdownCard`s: *Top countries* and *Top cities*.
   Countries render as `🇵🇭 PH`; cities as `Makati, PH`. Reuses the existing card component;
   the flag helper (`countryFlag(code)`) maps a two-letter code to its regional-indicator
   emoji.
2. **Services — top locations** — the same two-card pair, fed by `services_countries` /
   `services_cities`, directly answering "who is looking at services, and from where".

`null` country/city render as "Unknown". If `geo` is null (query failed) the whole block is
omitted, exactly as the section-reach block already guards on its own data.

## Inquiries surfacing — `components/admin/JourneyStrip.tsx`

The summary line gains location after the source:

```
Journey · 3 pages · via direct · 📍 Makati, PH
```

Derivation, in order of preference: `city + country` → `country` alone → the location segment
is omitted (no "Unknown" noise on a lead we could not locate). Location comes from the session's
journey rows, already fetched — no extra query. Inquiries with no journey rows are unchanged.

## Error handling

Consistent with the existing analytics. `geoFromHeaders` never throws (the city decode is
guarded); a missing edge simply yields `null`s. The `/api/track` insert already logs-and-204s on
failure. `getGeoSummary` returns `null` on error so the panel degrades. No client code changes,
so there is no new page-breaking surface.

## Testing

Vitest, extending the existing 58 tests. Logic stays in the pure parser so the rest is trivial:

- `geoFromHeaders` — Vercel full set (country/region/city), Cloudflare country-only fallback,
  Nginx `x-geoip-*` fallback, URL-decoded city, malformed city → `null`, `XX`/`T1` rejection,
  length capping, all-absent → all `null`.
- `countryFlag` — a known code maps to the right emoji; a non-code input degrades gracefully.
- `geo_summary` verified via `execute_sql`: correct shape, all four keys present, INVOKER.

Manual verification: because local dev sets no edge headers, city is `null` locally by design.
Confirm the panels render with "Unknown" locally, and verify real values against the Vercel
deployment (or by injecting `x-vercel-ip-*` headers on a manual `/api/track` POST).

## Out of scope

Region surfacing · lat/long · a map visualisation · per-path location for arbitrary pages
(only `/services` is built) · reverse-geocoding · ASN/ISP capture · VPS GeoIP setup itself
(only the header path that consumes it). Each is a separate decision, and none is justified now.
