# Interaction Events — Read Depth + Thin Click Tracking

**Date:** 2026-07-23
**Status:** Approved, ready for implementation
**Builds on:** `2026-07-22-first-party-analytics-design.md`

## Goal

Answer one question the current analytics cannot: **do visitors actually reach the content
we built?**

`page_views` says which pages are busy. It says nothing about what happens *within* a page —
and this site puts its heaviest work below the fold, in scroll-driven sequences (the pinned
3Ds sequence, `AboutIntro`, `IndustriesReveal`, `MvvReveal`) that only exist for a visitor
who keeps scrolling. If most visitors leave before the 3Ds pin, that is both a real finding
and a directly actionable one.

Secondary, and nearly free once the pipeline exists: capture the handful of clicks that leave
no trace today — outbound links, `mailto:`/`tel:`, and the primary CTAs.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Depth model | Named sections, not scroll % | A percentage doesn't say *what* is at that point, and shifts every time a page is edited. `threeds` stays meaningful across redesigns. |
| Storage | New `events` table | Leaves `page_views` and `analytics_summary()` untouched, so existing view/visitor counts cannot be corrupted by a new event type. |
| Transport | Batch in memory, flush on page hide | One request per page view instead of ~8. What `sendBeacon` exists for. |
| Click coverage | Thin slice, allowlist only | A full click map is noise at this traffic volume and its selectors break on every markup edit. Capture what is genuinely invisible today; nothing else. |
| Scope | Home, About, Services | The three scroll-heavy pages carrying the pinned sequences. Others tag later in minutes. |
| Section registry | Declared in code, not inferred from data | Decisive reason under Admin Surfacing below: without it, a section nobody reached is invisible. |

## Privacy

No change in posture. Events store a `path`, a short `label`, and optionally an outbound
`href` — no IP, no raw user-agent, no identifier surviving the tab. The `session_id` is the
same per-tab `sessionStorage` id already in use.

The existing privacy-policy wording (cookieless, first-party, no third-party sharing) covers
this without amendment, and **no consent banner becomes necessary.** `is_staging` mirrors
`page_views` so staging traffic stays separable at cutover.

## Schema

```sql
create table events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null,
  type        text not null check (type in ('section_view','click')),
  label       text not null,      -- 'threeds' | 'cta-contact' | 'outbound'
  path        text not null,
  meta        jsonb,              -- { href } for outbound/mailto/tel
  is_staging  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index events_created_at_idx on events (created_at desc);
create index events_session_idx    on events (session_id);
create index events_lookup_idx     on events (type, path, label);
```

**RLS** mirrors `page_views` exactly: enabled, staff-read-only, **no anon insert**. All writes
go through the service-role client in `/api/events`.

**Volume:** roughly 4–8 events per page view against ~60k page views/year, so ~250–500k
rows/year. Postgres is indifferent at that scale; the retention job stays deferred, as it is
for `page_views`.

## Capture

### Transport — `lib/analytics/events.ts`

A module-scope queue with two exports: `queueEvent(type, label, path, meta?)` and `flush()`.

**Path is recorded per event, not per batch.** A batch-level path would be wrong the moment a
flush trigger and a route change interleave, mislabelling one page's events as another's.
Per-event path removes that class of bug outright and costs one repeated short string.

Flush triggers, all three necessary:

1. `pagehide` — the normal exit.
2. `visibilitychange` → `hidden` — covers mobile tab-switch, where `pagehide` is unreliable.
3. **Client-side route change** — critical and easy to miss. The App Router never unloads
   between routes, so without an explicit flush on pathname change, every event from the
   previous page is silently discarded on internal navigation.

Flush is a no-op on an empty queue, and clears the queue *before* the beacon call so a
double-trigger (hide then unload) cannot double-send.

### Read depth — `lib/analytics/sections.ts` + `components/analytics/InteractionTracker.tsx`

Split deliberately. `lib/analytics/sections.ts` holds **only pure data and logic** — the
registry and `shouldFireSection()` — with no DOM references, because the admin server
component imports the registry too and must not drag browser code into a server bundle. The
`IntersectionObserver` wiring lives in the client component.

That client component carries the click listener as well, rather than a second component:
both need the same `pagehide` / `visibilitychange` / route-change flush lifecycle, and
splitting them would duplicate it.

Sections are marked in JSX: `<section data-track-section="threeds">`.

An `IntersectionObserver` with thresholds `[0, 0.5]` watches every `[data-track-section]`.
A section counts as **seen** when it is ≥50% visible, *or* any part of it has been
continuously visible for ≥1s. Without the dwell rule, fast scrolling inflates every number;
without the ratio rule, tall sections that never fit the viewport could never qualify.

The decision itself is a pure function — `shouldFireSection(ratio, dwellMs)` — so it is unit
testable without a DOM.

**Deduplication:** one `section_view` per `(session, path, section)`, tracked in a module-scope
`Set` living for the tab's lifetime. Sections re-enter view constantly when scrolling back up;
unchecked, one indecisive visitor reads as twelve.

The observer is rebuilt on pathname change, since the DOM is replaced on navigation.

### Clicks — `lib/analytics/clicks.ts`

One delegated listener on `document` (capture phase). For each click it walks `closest()` and
emits **only** on an allowlist match:

| Match | `label` | `meta` |
|---|---|---|
| `[data-track-click="…"]` | attribute value | — |
| `a[href^="mailto:"]` | `email` | `{ href }` |
| `a[href^="tel:"]` | `phone` | `{ href }` |
| `a[href]` with external host | `outbound` | `{ href }` |

Anything else is ignored. Classification is a pure function over `(href, dataset, siteHost)`,
unit tested; the listener is a thin wrapper.

Primary CTAs get an explicit `data-track-click` (e.g. `cta-contact`, `cta-discovery`) rather
than being inferred, so the label survives copy changes.

## Ingest — `app/api/events/route.ts`

Accepts a batch: `{ sessionId, events: [{ type, label, path, meta }] }`.

Modelled directly on `/api/track`: bot filter, rate limit, service-role insert, and
**always returns 204** — the tracker is invisible to visitors and must never retry.

Validation, as a pure `normalizeEventBatch()` in `lib/analytics/parse.ts` (unit tested):

- `sessionId` must pass the existing `isUuid`; `path` through the existing `sanitizePath`.
- `type` against the whitelist; `label` trimmed, non-empty, capped at 64 chars.
- Batch capped at **50 events**; excess dropped rather than rejecting the batch.
- `meta.href` capped at 512 chars.
- Invalid individual events are dropped; the valid remainder still inserts. One malformed
  entry must not lose an entire page's data.

Rows insert in a single `insert()` call with an array.

## Admin surfacing — `/admin/analytics`

A **Section reach** panel per tracked page: sections in document order, each with the
percentage of that page's views that reached it.

```
/  hero          100%  ████████████
/  industries     71%  ████████
/  threeds        38%  ████
/  three-es       22%  ██
```

Denominator is `page_views` for the same path and window — the two tables join on nothing but
`path`, which is sufficient since both are filtered to the same period.

**Why the section registry lives in code:** `lib/analytics/sections.ts` exports an ordered
registry of `path → [{ key, label }]`, shared by the tracker and this panel. It supplies
document order and display names, but the
decisive reason is that a section **nobody reached produces no rows at all** — a pure SQL
result cannot distinguish "0% reach" from "not tracked". Zero reach is precisely the finding
this feature exists to surface, so the set of expected sections must be declared, not inferred.

A second, smaller **Clicks** panel lists label and count, descending.

Aggregation goes in a `section_reach(days int)` SQL function alongside `analytics_summary`,
**SECURITY INVOKER** like its sibling — RLS is what keeps analytics staff-only.

## Error handling

Analytics must never break the page. Every capture path is wrapped so a throw is swallowed;
`getSessionId()` already returns `null` under Safari private mode and the tracker no-ops.
`IntersectionObserver` is assumed present (universal in supported browsers) but its absence
degrades to no depth data rather than a crash.

Server-side, a failed insert logs and still returns 204. Admin queries return `null` on
failure so a broken panel degrades instead of 500ing `/admin`, matching `getAnalyticsSummary`.

## Testing

Vitest, extending the existing 34 tests. The design deliberately pushes logic into pure
functions so the browser-dependent parts stay trivial:

- `normalizeEventBatch` — caps, drops, whitelist, partial-batch survival.
- `classifyClick` — mailto/tel/outbound/internal/data-attribute precedence.
- `shouldFireSection` — ratio and dwell thresholds.
- `sectionReach` percentage math, including the zero-views divide-by-zero case.

Manual verification: scroll the home page in a real browser and confirm one batch request on
navigation, with the expected sections and no duplicates.

## Out of scope

Full click map · heatmaps · rage-click detection · form-field analytics · cross-session
funnels · retention/rollup job · A/B testing. Each is a separate decision, and none is
justified at current traffic.
