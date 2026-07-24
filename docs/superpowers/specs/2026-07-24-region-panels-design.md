# Region in the Location Panels

**Date:** 2026-07-24
**Status:** Approved, ready for implementation
**Builds on:** `2026-07-24-visitor-geography-design.md`

## Goal

Surface the **region** (state / province / subdivision) that the visitor-geography
feature already captures on `page_views.region` but never displays. Add a "Top regions"
breakdown to both location sections on `/admin/analytics`, giving a country → region → city
drill between the two levels already shown.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Display form | A third "Top regions" card per section (Top countries · Top regions · Top cities) | Mirrors the existing two-card structure; keeps city labels uncluttered. Chosen over folding region into the city label. |
| Region label | `"<region>, <country>"` (e.g. `NSW, AU`) | The stored region is a bare ISO 3166-2 subdivision code (`NSW`, `TX`, `NCR`) — cryptic alone, so it always carries its country for context. |
| Null handling | Exclude `region is null` rows (no "Unknown" region bucket) | Same rule cities already follow; the country card already carries the Unknown total. |
| Formatter | Generalize `cityLabel` → `placeLabel(place, country)`, shared by cities and regions | The region label is identical logic to the city label ("value, country"). One generic formatter instead of duplicating the format string. |
| Scope | Both the overall and the `/services` section | The feature asked to surface region "in the location panels" — both sections are panels. |

## Aggregation — extend `geo_summary(days)`

The function signature is unchanged (`days`), so `lib/database.types.ts` needs **no regeneration**.
Add `region` to the `scoped` CTE and two new JSON keys, mirroring the city aggregates:

```sql
  scoped as (
    select country, region, city, path        -- region added
    from public.page_views, ws
    where is_staging = false and created_at >= ws.ts
  )
```

New keys in the returned object:

```sql
    'regions', coalesce((select json_agg(t) from (
      select region, country, count(*)::int as views
      from scoped where region is not null group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
    'services_regions', coalesce((select json_agg(t) from (
      select region, country, count(*)::int as views
      from scoped where path = '/services' and region is not null
      group by 1, 2 order by 3 desc, 1 limit 20) t), '[]'::json),
```

Still `create or replace`, still **SECURITY INVOKER** (unchanged) — RLS on `page_views` keeps it
staff-only. `analytics_summary()`, `section_reach()`, and the `events` table are untouched.

## Query layer — `GeoSummary`

`lib/analytics/queries.ts`: add two fields to the `GeoSummary` type, same element shape as `cities`:

```ts
  regions: Array<{ region: string; country: string | null; views: number }>;
  services_regions: Array<{ region: string; country: string | null; views: number }>;
```

`getGeoSummary` is unchanged — it already casts the RPC result to `GeoSummary`, and the SQL now
supplies the extra keys.

## Formatter — `placeLabel`

`lib/analytics/format.ts`: rename `cityLabel(city, country)` to `placeLabel(place, country)` — the
body is unchanged (`country ? \`${place}, ${country}\` : place`). Update its one internal caller,
`journeyLocation` (which uses it for the city+country branch), and its tests. Regions and cities
both call `placeLabel`.

## Display — `app/admin/analytics/page.tsx`

`LocationCards` gains a `regions` prop and renders three cards, in a three-column grid:

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
      <BreakdownCard title="Top countries" rows={countries.map((c) => ({ label: c.country, views: c.views }))} />
      <BreakdownCard title="Top regions" rows={regions.map((r) => ({ label: placeLabel(r.region, r.country), views: r.views }))} />
      <BreakdownCard title="Top cities" rows={cities.map((c) => ({ label: placeLabel(c.city, c.country), views: c.views }))} />
    </div>
  );
}
```

Both `<LocationCards>` call sites pass the matching region set — the overall block passes
`geo.regions`, the services block passes `geo.services_regions`. The `{geo && ...}` guard and the
"No data yet." empty state are unchanged, so an empty regions list renders a "No data yet." card,
consistent with the others.

## Privacy

No change. Region was already captured under the existing privacy-policy wording ("approximate
location (country and city) derived from your IP address at the network edge"). Region is coarser
than city; surfacing an already-collected field introduces no new capture and no new PII.

## Testing

- Rename the `cityLabel` describe block to `placeLabel` (behaviour identical); the `journeyLocation`
  tests are unchanged and still pass through `placeLabel` internally.
- Verify `geo_summary(30)` now returns all **six** keys (`countries`, `regions`, `cities`,
  `services_countries`, `services_regions`, `services_cities`) via `execute_sql`, and that it is
  still SECURITY INVOKER.
- `npm run build` clean; the three-column grid renders (region column shows "No data yet." until
  Vercel populates region in production).

## Out of scope

Region-only breakdown without country context · folding region into the city label · a map ·
generalizing `/services` to arbitrary paths · any change to capture (region is already stored).
