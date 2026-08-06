# Collapsing the analytics location cards

**Date:** 2026-08-06
**Status:** approved

## Why

The location panels on `/admin/analytics` make the page very tall. `LocationCards`
renders three `BreakdownCard`s and is itself rendered twice — once for "Top
locations" and once for "Services — top locations" — so the page carries six
cards, two of which run to 20 rows each. The row is also ragged: countries cap at
10 while regions and cities cap at 20, so the three cards in a row are visibly
different heights.

## The premise that did not hold

The request was for pagination, on the grounds that a list reaching 50 entries
would be slow to load. **It cannot.** `geo_summary(days)` caps every list in SQL:

```sql
countries          … limit 10
regions            … limit 20
cities             … limit 20
services_countries … limit 10
services_regions   … limit 20
services_cities    … limit 20
```

That is **100 rows maximum for the whole page**, permanently, regardless of
traffic. The screenshot that prompted this already shows the ceiling. Load time is
not a problem and pagination would not improve it.

The height complaint is real, though, so the fix is presentational.

## Design

### Component

Extract `BreakdownCard` from `app/admin/analytics/page.tsx` into
`components/admin/BreakdownCard.tsx`, beside `SectionReachCard` and `ViewsChart`.
It is a presentational unit with one job, and the page file is already carrying a
lot. Changing it fixes all six cards at once, because both sections route through
`LocationCards`.

### Behaviour

`VISIBLE_ROWS = 8`. The first 8 rows always render. Rows 9+ render inside a
`<details>` whose `<summary>` reads "Show all N". Cards with 8 rows or fewer render
exactly as they do today, with no toggle.

### Why `<details>`, not React state

- **No client JavaScript.** The analytics page is otherwise server-rendered; a
  `useState` toggle would add a client component and hydration for the sake of
  showing twelve more numbers.
- **Works with scripting disabled.** `a0f3f78` was shipped specifically to stop
  revealed content hiding forever when scripting fails. A JS toggle reintroduces
  that failure mode; `<details>` cannot.
- **Accessible by default.** `<summary>` is natively focusable, toggles on Enter
  and Space, and announces its expanded state to screen readers.

The label swaps to "Show less" when open via a `details[open]` CSS rule, so even
that needs no JavaScript.

### Not changing

The SQL caps stay. This is presentational only. If more than 20 regions or cities
should ever be visible, that is a change to the `geo_summary` limits — and the cap
and the page size should move together, so the UI never implies more data exists
than the query returns.

## Verification

Vitest here runs `environment: "node"` and collects only `**/*.test.ts`, so a
`.tsx` presentational component is not unit-testable in this setup. Verification is
therefore `tsc --noEmit`, the full suite (regression only), `npm run build`, and a
browser check of the real `/admin/analytics` page — confirming collapsed height,
that the toggle expands, and that all 20 rows are present in the served HTML while
collapsed (which is what proves the no-JS path works).
