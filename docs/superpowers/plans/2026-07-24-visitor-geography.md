# Visitor Geography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture visitor country + city (region stored, not shown) on `page_views`, and surface location on the inquiries journey strip, an overall "Top locations" analytics panel, and a `/services`-specific location panel.

**Architecture:** Location is a per-session attribute derived from edge headers at write time and stored on `page_views` — no IP is ever persisted. A pure `geoFromHeaders()` replaces the current `countryFromHeaders()`. One new `geo_summary(days)` SQL function aggregates countries/cities overall and for `/services`, leaving `analytics_summary()` and `section_reach()` untouched. Pure display formatters live in a new `lib/analytics/format.ts`. Every admin surface reads the already-captured columns.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-24-visitor-geography-design.md`

## Global Constraints

- **`/api/track` always returns 204** — success, bot, validation failure, DB error alike. Never surface an error, never retry. (Unchanged by this work.)
- **Never persist IP or raw user-agent.** Geo is derived from headers at write time; the IP is read at the edge and discarded.
- **`geoFromHeaders` must never throw.** The city URL-decode is wrapped; a malformed value yields `null`, never an exception.
- **SQL functions are SECURITY INVOKER** (the default). Never `SECURITY DEFINER` — RLS on `page_views` is what keeps analytics staff-only.
- **Leave `analytics_summary()`, `section_reach()`, and the `events` table unchanged.** This feature only adds columns to `page_views` and one new function.
- **`lib/database.types.ts` is regenerated verbatim** from the live schema after each migration — never hand-edited.
- **Vitest runs in `environment: "node"`** with `include: ["**/*.test.ts"]`. Tested code must not touch the DOM.
- Existing style: double quotes, semicolons on, `@/` path alias, `cn()` from `@/lib/cn`. Tests colocate as `<name>.test.ts`, run with `npm test`. Baseline is **58 passing tests**.

---

### Task 1: Capture — `geoFromHeaders` replaces `countryFromHeaders`

**Files:**
- Modify: `lib/analytics/parse.ts` (replace `countryFromHeaders`)
- Test: `lib/analytics/parse.test.ts` (replace the `countryFromHeaders` describe block)
- Modify: `app/api/track/route.ts` (migrate the import so the tree stays buildable)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type Geo = { country: string | null; region: string | null; city: string | null };
  export function geoFromHeaders(headers: Headers): Geo;
  ```
  The public `countryFromHeaders` export is **removed**. Its only code caller (`app/api/track/route.ts`) is migrated here to `geoFromHeaders(...).country` so this task stays typecheck-clean; Task 2 expands it to also write region/city.

- [ ] **Step 1: Replace the test block**

In `lib/analytics/parse.test.ts`, change the import: remove `countryFromHeaders`, add `geoFromHeaders`. The import block currently starts:

```ts
import {
  countryFromHeaders,
  isBot,
```

Replace `countryFromHeaders,` with `geoFromHeaders,`.

Then replace the entire `describe("countryFromHeaders", () => { ... })` block (it ends just before the next top-level `describe` or the end of file) with:

```ts
describe("geoFromHeaders", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("reads the full Vercel edge set", () => {
    expect(
      geoFromHeaders(
        h({
          "x-vercel-ip-country": "PH",
          "x-vercel-ip-country-region": "MM",
          "x-vercel-ip-city": "Makati",
        }),
      ),
    ).toEqual({ country: "PH", region: "MM", city: "Makati" });
  });

  it("url-decodes a Vercel city", () => {
    expect(
      geoFromHeaders(h({ "x-vercel-ip-city": "San%20Francisco" })).city,
    ).toBe("San Francisco");
  });

  it("keeps the raw city when decoding would throw", () => {
    expect(geoFromHeaders(h({ "x-vercel-ip-city": "Bad%ZZname" })).city).toBe(
      "Bad%ZZname",
    );
  });

  it("falls back to Cloudflare then Nginx GeoIP for country, and skips XX", () => {
    expect(geoFromHeaders(h({ "cf-ipcountry": "sg" })).country).toBe("SG");
    expect(geoFromHeaders(h({ "x-geoip-country": "AU" })).country).toBe("AU");
    expect(
      geoFromHeaders(h({ "x-vercel-ip-country": "XX", "cf-ipcountry": "PH" }))
        .country,
    ).toBe("PH");
  });

  it("reads city and region from Nginx GeoIP headers", () => {
    expect(
      geoFromHeaders(h({ "x-geoip-city": "Cebu", "x-geoip-region": "CEB" })),
    ).toMatchObject({ city: "Cebu", region: "CEB" });
  });

  it("rejects malformed country and returns nulls when nothing resolves", () => {
    expect(geoFromHeaders(h({ "x-vercel-ip-country": "PHL" })).country).toBeNull();
    expect(geoFromHeaders(h({ "cf-ipcountry": "T1" })).country).toBeNull();
    expect(geoFromHeaders(h({}))).toEqual({
      country: null,
      region: null,
      city: null,
    });
  });

  it("caps overlong city and region at 128 chars", () => {
    const g = geoFromHeaders(
      h({ "x-vercel-ip-city": "a".repeat(200), "x-geoip-region": "b".repeat(200) }),
    );
    expect(g.city).toHaveLength(128);
    expect(g.region).toHaveLength(128);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `geoFromHeaders is not a function` (and the removed import).

- [ ] **Step 3: Replace the implementation in `lib/analytics/parse.ts`**

Replace the entire `countryFromHeaders` block — from its `/**` doc comment through the closing `}` of the function, including the `COUNTRY_HEADERS` const — with:

```ts
export type Geo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "x-geoip-country"];
const REGION_HEADERS = ["x-vercel-ip-country-region", "x-geoip-region"];
const CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity", "x-geoip-city"];
const MAX_GEO = 128;

/** First non-empty value across a header fallback chain, trimmed. */
function firstHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Country is validated per header, not just first-non-empty: Cloudflare sends
 * XX for anonymised clients and T1 for Tor, and we want the next edge's value
 * when that happens.
 */
function countryFromHeaders(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") {
      return value;
    }
  }
  return null;
}

/** URL-decoded, trimmed, length-capped city. Decode failure keeps the raw value. */
function cityFromHeaders(headers: Headers): string | null {
  const raw = firstHeader(headers, CITY_HEADERS);
  if (!raw) return null;
  let city = raw;
  try {
    city = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding: fall back to the raw header value.
  }
  city = city.trim();
  return city ? city.slice(0, MAX_GEO) : null;
}

/**
 * Country, region, and city from whichever edge set them. `x-vercel-ip-*` exist
 * only on Vercel; a VPS falls back to Cloudflare or Nginx GeoIP headers. Any
 * field is null when no edge resolved it. Never throws.
 */
export function geoFromHeaders(headers: Headers): Geo {
  const region = firstHeader(headers, REGION_HEADERS);
  return {
    country: countryFromHeaders(headers),
    region: region ? region.slice(0, MAX_GEO) : null,
    city: cityFromHeaders(headers),
  };
}
```

Note: `countryFromHeaders` is now a private helper (no `export`), so the old public export is gone.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green (58 baseline, `geoFromHeaders` block replaces the old one).

- [ ] **Step 5: Migrate the track route so the tree still builds**

`app/api/track/route.ts` imports the now-removed `countryFromHeaders`. Change its import from `@/lib/analytics/parse` — remove `countryFromHeaders`, add `geoFromHeaders` (keep the rest):

```ts
import {
  deriveSource,
  deviceFromUserAgent,
  extractUtm,
  geoFromHeaders,
  isBot,
  isUuid,
  referrerHost,
  sanitizePath,
} from "@/lib/analytics/parse";
```

Then, in the `page_views` insert, replace the line
`country: countryFromHeaders(request.headers),` with:

```ts
      country: geoFromHeaders(request.headers).country,
```

(Region/city are wired in Task 2, once the columns exist.)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/analytics/parse.ts lib/analytics/parse.test.ts "app/api/track/route.ts"
git commit -m "Replace countryFromHeaders with geoFromHeaders (country + region + city)"
```

---

### Task 2: Schema + capture wiring — `region`/`city` columns and `/api/track`

**Files:**
- Apply: Supabase migration `add_page_view_geo_columns`
- Modify: `app/api/track/route.ts`
- Modify: `lib/database.types.ts` (regenerated)

**Interfaces:**
- Consumes: `geoFromHeaders` (Task 1).
- Produces: `page_views.region`, `page_views.city` populated on every non-bot page view; `Database["public"]["Tables"]["page_views"]` gains `region`/`city`.

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool, name `add_page_view_geo_columns`:

```sql
alter table public.page_views add column region text;
alter table public.page_views add column city text;
```

- [ ] **Step 2: Verify the columns exist**

Use the MCP `execute_sql` tool:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'page_views'
  and column_name in ('region', 'city') order by 1;
```

Expected: two rows — `city`, `region`.

- [ ] **Step 3: Expand the track insert to write region and city**

The import was already migrated to `geoFromHeaders` in Task 1. Now in `app/api/track/route.ts`, just before the `supabase.from("page_views").insert({` call, derive geo once:

```ts
    const geo = geoFromHeaders(request.headers);
```

And within the insert object, replace the single line
`country: geoFromHeaders(request.headers).country,` with:

```ts
      country: geo.country,
      region: geo.region,
      city: geo.city,
```

- [ ] **Step 4: Regenerate the database types**

Use the MCP `generate_typescript_types` tool and write its output verbatim over `lib/database.types.ts`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Verify a geo row lands end to end**

Start the dev server (`npm run dev`), then POST with injected Vercel headers (local dev sets none itself):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/track \
  -H 'content-type: application/json' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36' \
  -H 'x-vercel-ip-country: AU' \
  -H 'x-vercel-ip-country-region: NSW' \
  -H 'x-vercel-ip-city: Sydney' \
  -d '{"sessionId":"3f2504e0-4f89-41d3-9a0c-0305e82c3301","path":"/services"}'
```

Expected: `204`. Then confirm via MCP `execute_sql`:

```sql
select country, region, city, path from public.page_views
where session_id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301' order by id desc limit 1;
```

Expected: `AU | NSW | Sydney | /services`. Clean up the probe row:

```sql
delete from public.page_views where session_id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
```

- [ ] **Step 7: Commit**

```bash
git add "app/api/track/route.ts" lib/database.types.ts
git commit -m "Capture region and city on page views"
```

---

### Task 3: Aggregation — `geo_summary` function and query helper

**Files:**
- Apply: Supabase migration `add_geo_summary_function`
- Modify: `lib/analytics/queries.ts`
- Modify: `lib/database.types.ts` (regenerated)

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`.
- Produces:
  ```ts
  export type GeoSummary = {
    countries: Array<{ country: string; views: number }>;
    cities: Array<{ city: string; country: string | null; views: number }>;
    services_countries: Array<{ country: string; views: number }>;
    services_cities: Array<{ city: string; country: string | null; views: number }>;
  };
  export async function getGeoSummary(days: number): Promise<GeoSummary | null>;
  ```

- [ ] **Step 1: Apply the SQL function**

Use the MCP `apply_migration` tool, name `add_geo_summary_function`. SECURITY INVOKER (the default) — do not add `security definer`:

```sql
create or replace function public.geo_summary(days integer default 30)
returns json
language sql
stable
as $$
  with ws as (select now() - make_interval(days => days) as ts),
  scoped as (
    select country, city, path
    from public.page_views, ws
    where is_staging = false and created_at >= ws.ts
  )
  select json_build_object(
    'countries', coalesce((select json_agg(t) from (
      select coalesce(country, 'Unknown') as country, count(*)::int as views
      from scoped group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'cities', coalesce((select json_agg(t) from (
      select city, country, count(*)::int as views
      from scoped where city is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
    'services_countries', coalesce((select json_agg(t) from (
      select coalesce(country, 'Unknown') as country, count(*)::int as views
      from scoped where path = '/services' group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'services_cities', coalesce((select json_agg(t) from (
      select city, country, count(*)::int as views
      from scoped where path = '/services' and city is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json)
  );
$$;

revoke all on function public.geo_summary(int) from public, anon;
grant execute on function public.geo_summary(int) to authenticated;
```

- [ ] **Step 2: Verify the function runs, has the right shape, and is INVOKER**

Use the MCP `execute_sql` tool:

```sql
select
  (select prosecdef from pg_proc where proname = 'geo_summary') as is_definer,
  (public.geo_summary(30)::jsonb ?& array['countries','cities','services_countries','services_cities']) as has_all_keys;
```

Expected: `is_definer = false`, `has_all_keys = true`.

- [ ] **Step 3: Regenerate the database types**

Use the MCP `generate_typescript_types` tool and write its output verbatim over `lib/database.types.ts`. This adds `geo_summary` to `Functions` so the `.rpc("geo_summary")` call typechecks.

- [ ] **Step 4: Add the query helper**

In `lib/analytics/queries.ts`, append at the end of the file:

```ts
export type GeoSummary = {
  countries: Array<{ country: string; views: number }>;
  cities: Array<{ city: string; country: string | null; views: number }>;
  services_countries: Array<{ country: string; views: number }>;
  services_cities: Array<{ city: string; country: string | null; views: number }>;
};

/** Returns null on failure so a broken panel degrades instead of 500ing /admin. */
export async function getGeoSummary(days: number): Promise<GeoSummary | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("geo_summary", { days });
    if (error) {
      console.error("[analytics] geo summary failed:", error.message);
      return null;
    }
    return data as unknown as GeoSummary;
  } catch (err) {
    console.error("[analytics] geo summary threw:", err);
    return null;
  }
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/queries.ts lib/database.types.ts
git commit -m "Add geo_summary aggregation and query helper"
```

---

### Task 4: Display formatters — `lib/analytics/format.ts`

**Files:**
- Create: `lib/analytics/format.ts`
- Test: `lib/analytics/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export function countryFlag(code: string | null): string;   // "🇵🇭" or ""
  export function cityLabel(city: string, country: string | null): string; // "Makati, PH"
  export function journeyLocation(city: string | null, country: string | null): string | null;
  ```
  Pure, no DOM. `countryFlag`/`cityLabel` feed the analytics panels (Task 6); `journeyLocation` feeds the inquiry strip (Task 5).

- [ ] **Step 1: Write the failing tests**

Create `lib/analytics/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { countryFlag, cityLabel, journeyLocation } from "@/lib/analytics/format";

describe("countryFlag", () => {
  it("maps a two-letter code to its regional-indicator emoji", () => {
    expect(countryFlag("PH")).toBe("🇵🇭");
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  it("returns empty string for null, the Unknown sentinel, or non-codes", () => {
    expect(countryFlag(null)).toBe("");
    expect(countryFlag("Unknown")).toBe("");
    expect(countryFlag("PHL")).toBe("");
  });
});

describe("cityLabel", () => {
  it("appends the country code when present", () => {
    expect(cityLabel("Makati", "PH")).toBe("Makati, PH");
  });

  it("returns the bare city when country is null", () => {
    expect(cityLabel("Makati", null)).toBe("Makati");
  });
});

describe("journeyLocation", () => {
  it("prefers city + country", () => {
    expect(journeyLocation("Sydney", "AU")).toBe("Sydney, AU");
  });

  it("falls back to country alone, then to null", () => {
    expect(journeyLocation(null, "AU")).toBe("AU");
    expect(journeyLocation(null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/analytics/format`.

- [ ] **Step 3: Implement `lib/analytics/format.ts`**

```ts
/**
 * Pure display formatters for stored geo values. No DOM, no I/O — unit-tested
 * in format.test.ts. Kept separate from parse.ts, which handles inbound
 * request parsing rather than presentation.
 */

/** Regional-indicator flag emoji for a two-letter ISO code, or "" for anything else. */
export function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  const BASE = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(
    BASE + code.charCodeAt(0) - 65,
    BASE + code.charCodeAt(1) - 65,
  );
}

/** "Makati, PH" — or just the city when country is unknown. */
export function cityLabel(city: string, country: string | null): string {
  return country ? `${city}, ${country}` : city;
}

/**
 * Location line for an inquiry: city+country, else country, else null so the
 * strip omits the segment entirely rather than printing "Unknown".
 */
export function journeyLocation(
  city: string | null,
  country: string | null,
): string | null {
  if (city) return cityLabel(city, country);
  if (country) return country;
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all green.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/format.ts lib/analytics/format.test.ts
git commit -m "Add pure geo display formatters"
```

---

### Task 5: Inquiries — location on the journey strip

**Files:**
- Modify: `lib/analytics/queries.ts` (`JourneyStep` type + `getJourneys` select/mapping)
- Modify: `components/admin/JourneyStrip.tsx`

**Interfaces:**
- Consumes: `journeyLocation` (Task 4); `page_views.country`/`city` (Task 2).
- Produces: `JourneyStep` gains `country: string | null` and `city: string | null`; the strip renders a location segment.

- [ ] **Step 1: Extend `JourneyStep` and the query**

In `lib/analytics/queries.ts`, replace the `JourneyStep` type:

```ts
export type JourneyStep = {
  path: string;
  source: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
};
```

In `getJourneys`, extend the `.select(...)` string to include the two columns:

```ts
      .select("session_id, path, source, country, city, created_at")
```

And in the row-mapping loop, add the two fields to the pushed object:

```ts
      steps.push({
        path: row.path,
        source: row.source,
        country: row.country,
        city: row.city,
        created_at: row.created_at,
      });
```

- [ ] **Step 2: Render location in `JourneyStrip.tsx`**

In `components/admin/JourneyStrip.tsx`, add the import:

```tsx
import { journeyLocation } from "@/lib/analytics/format";
```

Immediately after the existing `const arrivedFrom = steps[0].source ?? "direct";` line, add:

```tsx
  const location = journeyLocation(steps[0].city, steps[0].country);
```

Then, inside the `<summary>`, append the location segment after the `via {arrivedFrom}` text. Replace the summary's inner content:

```tsx
      <summary className="cursor-pointer text-xs font-medium text-purple">
        Journey · {steps.length} page{steps.length === 1 ? "" : "s"} · via{" "}
        {arrivedFrom}
        {location ? ` · 📍 ${location}` : ""}
      </summary>
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean. (If a stale `.next/dev/types/routes.d.ts` error appears, `rm -rf .next` and rebuild — a known local artifact issue.)

- [ ] **Step 4: Verify against real data**

Confirm the join surfaces a location. Using MCP `execute_sql`, find a session that has both an inquiry and a located page view:

```sql
select i.id, pv.city, pv.country
from inquiries i
join page_views pv on pv.session_id = i.session_id
where pv.city is not null limit 1;
```

If a row exists, open `/admin/inquiries` (log in first) and confirm that inquiry's strip reads `… · 📍 <City>, <CC>`. If no such row exists yet (common on fresh data), that is expected — inquiries without located views simply omit the segment, which is the designed behaviour.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/queries.ts components/admin/JourneyStrip.tsx
git commit -m "Show visitor location on the inquiry journey strip"
```

---

### Task 6: Analytics — Top locations and Services location panels

**Files:**
- Modify: `app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `getGeoSummary`, `GeoSummary` (Task 3); `countryFlag`, `cityLabel` (Task 4); the existing inline `BreakdownCard` component in this file.
- Produces: a "Top locations" section and a "Services — top locations" section on `/admin/analytics`.

- [ ] **Step 1: Add imports and the parallel fetch**

In `app/admin/analytics/page.tsx`, update the queries import to include `getGeoSummary` and `GeoSummary`, and add the formatters import:

```tsx
import {
  getAnalyticsSummary,
  getSectionReach,
  getGeoSummary,
  reachRows,
  type GeoSummary,
} from "@/lib/analytics/queries";
import { countryFlag, cityLabel } from "@/lib/analytics/format";
```

Change the existing parallel fetch to add geo (it currently destructures `[summary, reach]`):

```tsx
  const [summary, reach, geo] = await Promise.all([
    getAnalyticsSummary(days),
    getSectionReach(days),
    getGeoSummary(days),
  ]);
```

The existing `if (!summary)` early return stays as-is; `geo` being null is handled by the guard below, so a failed geo read cannot blank the page.

- [ ] **Step 2: Add a locations renderer helper above the component**

Still in `app/admin/analytics/page.tsx`, add this helper just after the existing `BreakdownCard` function (it maps a `GeoSummary` country/city pair into the two `BreakdownCard`s, keeping the JSX below DRY):

```tsx
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
          label: `${countryFlag(c.country)} ${c.country}`.trim(),
          views: c.views,
        }))}
      />
      <BreakdownCard
        title="Top cities"
        rows={cities.map((c) => ({
          label: cityLabel(c.city, c.country),
          views: c.views,
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Render both sections**

Insert this block immediately before the closing `</div>` of the page's root element — after the Section reach block if present, otherwise after the Top pages/sources grid:

```tsx
      {geo && (
        <>
          <h2 className="mt-12 text-lg font-semibold text-ink">Top locations</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Where visitors accessed the site from. Unknown = no location resolved.
          </p>
          <div className="mt-5">
            <LocationCards countries={geo.countries} cities={geo.cities} />
          </div>

          <h2 className="mt-12 text-lg font-semibold text-ink">
            Services — top locations
          </h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Where visitors to the services page came from.
          </p>
          <div className="mt-5">
            <LocationCards
              countries={geo.services_countries}
              cities={geo.services_cities}
            />
          </div>
        </>
      )}
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 5: Verify the panels render**

Start `npm run dev`, log in at `/login`, open `http://localhost:3000/admin/analytics`. Confirm two new sections appear: "Top locations" (Top countries / Top cities cards) and "Services — top locations". With only unlocated local data, countries shows `Unknown` and cities shows "No data yet." — both correct. To see real values, first POST a few located views:

```bash
for c in "PH:Makati" "AU:Sydney" "US:Austin"; do
  cc=${c%%:*}; city=${c#*:};
  curl -s -o /dev/null -X POST http://localhost:3000/api/track \
    -H 'content-type: application/json' \
    -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36' \
    -H "x-vercel-ip-country: $cc" -H "x-vercel-ip-city: $city" \
    -d "{\"sessionId\":\"$(cat /proc/sys/kernel/random/uuid)\",\"path\":\"/services\"}";
done
```

Reload `/admin/analytics`; confirm flags + cities now appear in both the overall and services panels. Then delete the probes:

```sql
delete from public.page_views where city in ('Makati','Sydney','Austin') and path = '/services';
```

- [ ] **Step 6: Commit**

```bash
git add "app/admin/analytics/page.tsx"
git commit -m "Add top-locations and services-location panels to analytics"
```

---

### Task 7: Docs — privacy policy wording and checklist caveat

**Files:**
- Modify: `app/(site)/privacy-policy/page.tsx`
- Modify: `PRE-LAUNCH-CHECKLIST.md`

**Interfaces:**
- Consumes: nothing.
- Produces: accurate privacy wording; a recorded deploy-target caveat.

- [ ] **Step 1: Correct the privacy-policy analytics description**

In `app/(site)/privacy-policy/page.tsx`, the "Methods Utilized for Automated Access" section currently opens with an inaccurate sentence (it describes a third-party, cookie-based service). Replace that first string:

```ts
      "The Company uses third-party analytics services to analyze our web traffic data, facilitate in gauging our website’s engagement, and enhance our website services and features. This service employs cookies. The data produced is not disclosed to any other entity.",
```

with:

```ts
      "The Company uses its own first-party, cookieless analytics to understand website traffic and improve our services. We record an approximate location (country and city) derived from your IP address at the network edge; we do not store your IP address. No data is disclosed to any other entity, and no cookies are used for this purpose.",
```

- [ ] **Step 2: Record the deploy-target caveat in the checklist**

In `PRE-LAUNCH-CHECKLIST.md`, under the §4 subsection "VPS-specific gotcha — country tracking", append a bullet after the existing content of that subsection:

```markdown
- **City/region precision is Vercel-only for free.** `geoFromHeaders()` also reads
  `x-vercel-ip-city` / `x-vercel-ip-country-region` (Vercel) and `cf-ipcity` / `x-geoip-*`
  (Cloudflare Enterprise / Nginx GeoIP). Cloudflare's **free** tier gives country only — a VPS
  needs an Nginx MaxMind GeoIP module to populate `city`. Without it, `city`/`region` stay null
  (shown as "Unknown"; harmless). No new cutover cleanup line is needed — `city`/`region` live on
  `page_views`, already covered by `delete from page_views where is_staging = true`.
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (privacy page is a `.tsx` data change).

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/privacy-policy/page.tsx" PRE-LAUNCH-CHECKLIST.md
git commit -m "Update privacy wording for first-party geo capture and note VPS caveat"
```

---

## Post-implementation

- [ ] Run the full suite: `npm test` — expected all passing (58 baseline + `geoFromHeaders` rework + `format.ts` tests).
- [ ] Run `npm run build` — expected clean.
- [ ] Confirm no probe rows remain: `select count(*) from page_views where session_id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301' or city in ('Makati','Sydney','Austin');` → expected `0`.
- [ ] Sanity-check that `analytics_summary()` and `section_reach()` still return their original shapes (unchanged by this work).
