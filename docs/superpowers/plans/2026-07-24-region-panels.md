# Region in Location Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the already-captured `page_views.region` as a "Top regions" card in both location sections on `/admin/analytics`.

**Architecture:** Extend the existing `geo_summary(days)` SQL function with `regions`/`services_regions` aggregates, add the fields to the `GeoSummary` type, generalize the `cityLabel` formatter to `placeLabel`, and render a third card per section. No capture change, no `database.types.ts` regeneration (the function signature is unchanged).

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-24-region-panels-design.md`

## Global Constraints

- **`geo_summary` stays SECURITY INVOKER** (the default) — never `SECURITY DEFINER`. RLS on `page_views` is what keeps analytics staff-only.
- **Do not touch `analytics_summary()`, `section_reach()`, or the `events` table.** Only `geo_summary` changes.
- **No `lib/database.types.ts` regeneration** — the `geo_summary(days)` signature is unchanged, so the generated types are already correct.
- **Region label always carries country:** `"<region>, <country>"` (e.g. `NSW, AU`); exclude `region is null` rows (no "Unknown" region bucket).
- **`lib/analytics/format.ts` stays pure** — no DOM, no I/O.
- Existing style: double quotes, semicolons on, `@/` alias, `cn()` from `@/lib/cn`. Tests colocate as `<name>.test.ts`, run with `npm test`. Baseline is **65 passing tests**.

---

### Task 1: Aggregation — `regions` in `geo_summary` + `GeoSummary`

**Files:**
- Apply: Supabase migration `geo_summary_add_regions`
- Modify: `lib/analytics/queries.ts` (`GeoSummary` type)

**Interfaces:**
- Consumes: nothing new.
- Produces: `geo_summary` JSON gains `regions` and `services_regions` (each `{region, country, views}`); `GeoSummary` gains `regions`/`services_regions: Array<{ region: string; country: string | null; views: number }>`.

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool, name `geo_summary_add_regions`. This is a full `create or replace` of the existing function with `region` added to the `scoped` CTE and two new keys. SECURITY INVOKER (the default) — do not add `security definer`:

```sql
create or replace function public.geo_summary(days integer default 30)
returns json
language sql
stable
as $$
  with ws as (select now() - make_interval(days => days) as ts),
  scoped as (
    select country, region, city, path
    from public.page_views, ws
    where is_staging = false and created_at >= ws.ts
  )
  select json_build_object(
    'countries', coalesce((select json_agg(t) from (
      select coalesce(country, 'Unknown') as country, count(*)::int as views
      from scoped group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'regions', coalesce((select json_agg(t) from (
      select region, country, count(*)::int as views
      from scoped where region is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
    'cities', coalesce((select json_agg(t) from (
      select city, country, count(*)::int as views
      from scoped where city is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
    'services_countries', coalesce((select json_agg(t) from (
      select coalesce(country, 'Unknown') as country, count(*)::int as views
      from scoped where path = '/services' group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'services_regions', coalesce((select json_agg(t) from (
      select region, country, count(*)::int as views
      from scoped where path = '/services' and region is not null
      group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
    'services_cities', coalesce((select json_agg(t) from (
      select city, country, count(*)::int as views
      from scoped where path = '/services' and city is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json)
  );
$$;
```

- [ ] **Step 2: Verify the function returns all six keys and is still INVOKER**

Use the MCP `execute_sql` tool:

```sql
select
  (select prosecdef from pg_proc where proname = 'geo_summary') as is_definer,
  (public.geo_summary(30)::jsonb ?& array[
    'countries','regions','cities',
    'services_countries','services_regions','services_cities']) as has_all_keys;
```

Expected: `is_definer = false`, `has_all_keys = true`.

- [ ] **Step 3: Add the two fields to `GeoSummary`**

In `lib/analytics/queries.ts`, find the `GeoSummary` type and add `regions` after `countries` and `services_regions` after `services_countries`, so the type reads:

```ts
export type GeoSummary = {
  countries: Array<{ country: string; views: number }>;
  regions: Array<{ region: string; country: string | null; views: number }>;
  cities: Array<{ city: string; country: string | null; views: number }>;
  services_countries: Array<{ country: string; views: number }>;
  services_regions: Array<{ region: string; country: string | null; views: number }>;
  services_cities: Array<{ city: string; country: string | null; views: number }>;
};
```

`getGeoSummary` is unchanged — it already casts the RPC result to `GeoSummary`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/queries.ts
git commit -m "Add region aggregates to geo_summary and GeoSummary"
```

---

### Task 2: Rename `cityLabel` → `placeLabel`

**Files:**
- Modify: `lib/analytics/format.ts`
- Modify: `lib/analytics/format.test.ts`
- Modify: `app/admin/analytics/page.tsx` (the existing `cityLabel` import + city usage)

**Interfaces:**
- Consumes: nothing new.
- Produces: `placeLabel(place: string, country: string | null): string` replaces `cityLabel` (identical body). `journeyLocation` uses `placeLabel` internally. This is a pure rename — no behaviour change.

- [ ] **Step 1: Rename in `lib/analytics/format.ts`**

Replace the `cityLabel` function and update `journeyLocation`'s call:

```ts
/** "Makati, PH" — value plus country code, or just the value when country is unknown. */
export function placeLabel(place: string, country: string | null): string {
  return country ? `${place}, ${country}` : place;
}

/**
 * Location line for an inquiry: city+country, else country, else null so the
 * strip omits the segment entirely rather than printing "Unknown".
 */
export function journeyLocation(
  city: string | null,
  country: string | null,
): string | null {
  if (city) return placeLabel(city, country);
  if (country) return country;
  return null;
}
```

- [ ] **Step 2: Rename the tests in `lib/analytics/format.test.ts`**

Update the import and the `cityLabel` describe block:

```ts
import { placeLabel, journeyLocation } from "@/lib/analytics/format";

describe("placeLabel", () => {
  it("appends the country code when present", () => {
    expect(placeLabel("Makati", "PH")).toBe("Makati, PH");
  });

  it("returns the bare value when country is null", () => {
    expect(placeLabel("Makati", null)).toBe("Makati");
  });
});
```

The `journeyLocation` describe block below is unchanged.

- [ ] **Step 3: Update the analytics page's existing `cityLabel` use**

In `app/admin/analytics/page.tsx`, change the import from `cityLabel` to `placeLabel`:

```tsx
import { placeLabel } from "@/lib/analytics/format";
```

and in `LocationCards`, the Top cities card, change `cityLabel(c.city, c.country)` to:

```tsx
          label: placeLabel(c.city, c.country),
```

(The regions card is added in Task 3.)

- [ ] **Step 4: Run tests, typecheck, build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 65 tests pass (rename only, count unchanged), no type errors, clean build. (If a stale `.next/dev/types/routes.d.ts` error appears, `rm -rf .next` and rebuild.)

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/format.ts lib/analytics/format.test.ts "app/admin/analytics/page.tsx"
git commit -m "Generalize cityLabel to placeLabel for reuse with regions"
```

---

### Task 3: Display — Top regions card

**Files:**
- Modify: `app/admin/analytics/page.tsx` (`LocationCards` + both call sites)

**Interfaces:**
- Consumes: `GeoSummary["regions"]` (Task 1); `placeLabel` (Task 2).
- Produces: a "Top regions" card between Top countries and Top cities in both location sections.

- [ ] **Step 1: Add `regions` to `LocationCards` and make it a three-column grid**

In `app/admin/analytics/page.tsx`, replace the `LocationCards` function with:

```tsx
function LocationCards({
  countries,
  regions,
  cities,
}: {
  countries: GeoSummary["countries"];
  regions: GeoSummary["regions"];
  cities: GeoSummary["cities"];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <BreakdownCard
        title="Top countries"
        rows={countries.map((c) => ({
          label: c.country,
          views: c.views,
        }))}
      />
      <BreakdownCard
        title="Top regions"
        rows={regions.map((r) => ({
          label: placeLabel(r.region, r.country),
          views: r.views,
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
```

- [ ] **Step 2: Pass `regions` at both call sites**

In the same file, both `<LocationCards ... />` usages currently pass only `countries` and `cities`. Add the matching region set to each.

The overall "Top locations" block:

```tsx
            <LocationCards
              countries={geo.countries}
              regions={geo.regions}
              cities={geo.cities}
            />
```

The "Services — top locations" block:

```tsx
            <LocationCards
              countries={geo.services_countries}
              regions={geo.services_regions}
              cities={geo.services_cities}
            />
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean. TypeScript will fail here if either call site was missed (the `regions` prop is required), which is the intended safety net.

- [ ] **Step 4: Verify the panels render**

Start `npm run dev`, log in at `/login`, open `http://localhost:3000/admin/analytics`. Confirm each location section now shows three cards — Top countries, **Top regions**, Top cities — in a three-column row on desktop. With no region data yet (region only populates on Vercel), the Top regions card shows "No data yet." — correct.

Optional real-data check (region only): inject a couple of located views via the MCP `execute_sql` tool, reload, then delete them:

```sql
insert into public.page_views (session_id, path, source, device, country, region, city, is_staging) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/services', 'direct', 'desktop', 'AU', 'NSW', 'Sydney', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/',         'direct', 'desktop', 'US', 'TX',  'Austin', false);
-- reload /admin/analytics: Top regions shows "NSW, AU" and "TX, US"
delete from public.page_views where session_id in
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
```

- [ ] **Step 5: Commit**

```bash
git add "app/admin/analytics/page.tsx"
git commit -m "Add Top regions card to the location panels"
```

---

## Post-implementation

- [ ] `npm test` — expected 65 passing (rename kept the count).
- [ ] `npm run build` — expected clean.
- [ ] Confirm no probe rows remain if the optional Task 3 check was run: `select count(*) from page_views where session_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');` → expected `0`.
- [ ] Spot-check that `analytics_summary()` and `section_reach()` still return their original shapes (untouched by this work).
