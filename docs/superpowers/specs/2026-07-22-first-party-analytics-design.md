# First-Party Analytics + Lead Journeys

**Date:** 2026-07-22
**Status:** Approved, ready for implementation

## Goal

Capture visitor behaviour on the public site and surface it in `/admin`, covering two
needs with one dataset:

1. **Traffic analytics** — views, unique visitors, top pages, traffic sources, device split, trend over time.
2. **Lead journeys** — for each inquiry, the pages that visitor viewed before submitting, and how they arrived.

The join between the two is the point. Traffic numbers alone say which pages are busy;
joined to inquiries they say which pages *convert*.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Build vs buy | Self-hosted in Supabase | Only option keeping traffic and lead data in one database, so journeys are a SQL join rather than an integration. No new stack, no subscription. |
| Visitor ID persistence | `sessionStorage`, per-tab | Gives within-visit journeys (90% of the value) without cross-session behavioural tracking. Defensible with no consent banner under PH DPA and GDPR. |
| Consent banner | Not required | No cross-session tracking, no PII stored, no third-party sharing. See Privacy below. |
| Aggregation | Postgres function | JS-side reduction over raw rows works at 500 rows and fails at 50,000. |
| Rollups / retention job | Deferred | ~60k rows/year at expected volume. Postgres does not care. Add later if volume justifies it; premature now and costs granularity. |

## Privacy

Deliberately **not** stored: IP address, raw user-agent, any identifier that survives the tab.

`device` and `country` are derived server-side at write time from request headers and the
raw values discarded. This keeps `page_views` genuinely anonymous, which is what makes
operating without a consent banner defensible rather than merely convenient.

`is_staging` mirrors the existing `_staging` tagging convention in `lib/forms.ts`, so
staging traffic stays separable at production cutover.

## Schema

```sql
create table page_views (
  id          bigint generated always as identity primary key,
  session_id  uuid not null,
  path        text not null,
  referrer    text,          -- external referrer host only; null on internal navigation
  source      text,          -- derived channel: google | linkedin | facebook | direct | <utm_source>
  utm         jsonb,         -- utm_* params when present
  device      text check (device in ('mobile','tablet','desktop')),
  country     text,
  is_staging  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index page_views_created_at_idx on page_views (created_at desc);
create index page_views_session_idx    on page_views (session_id);

alter table inquiries add column session_id uuid;
create index inquiries_session_idx on inquiries (session_id);
```

`inquiries.session_id` is a real column, not a key inside `payload`, because
`app/admin/inquiries/page.tsx` renders payload entries generically — a raw UUID would
surface as a junk field in the UI. It is nullable: if JS failed or the tracker was
blocked, the inquiry still saves exactly as it does today.

**RLS:** `page_views` has RLS enabled with no anon/authenticated `insert` policy — writes
go exclusively through the service-role client in the track route. `select` is granted to
authenticated staff only.

## Capture

**`components/Analytics.tsx`** — client component mounted in `app/(site)/layout.tsx`
(not the root layout, so `/admin` and `/login` are never tracked; staff clicks must not
pollute the numbers).

- Reads or creates `ppl_sid`, a `crypto.randomUUID()` in `sessionStorage`.
- Fires on every `usePathname()` change via `navigator.sendBeacon` — fire-and-forget,
  never blocks navigation, survives the user leaving the page.
- All work wrapped in try/catch: `sessionStorage` throws in Safari private mode and that
  must not white-screen the site.

**`POST /api/track`** — validates, drops bots, derives `device`/`country` from headers,
inserts via `getServiceClient()`. Rate-limited via the existing `lib/rateLimit` helper.
Returns `204` on **every** path, including validation failure and DB error — the tracker
is invisible to users and must never surface an error or trigger a retry storm.

**Bot filtering, two layers:** being client-JS already excludes most crawlers; a
user-agent regex at the route catches headless ones. Filtered hits are never written, so
the table stays clean rather than needing an `is_bot` flag filtered at read time forever.

**Journey linking:** `persistInquiry()` takes `session_id` as a third argument. The
contact, discovery, and referral forms read it from `sessionStorage` and post it along.
Analytics must never be able to break lead capture — a missing or malformed session ID is
ignored, not rejected.

## Reading it back

**`analytics_summary(days int)`** — one Postgres function returning a single JSON object:
totals (views, unique sessions), daily time series, top pages, top sources, device split.
One RPC call, one round trip, aggregation stays where the data is. Excludes
`is_staging = true` rows.

**`/admin/analytics`** — new page and nav entry:
- Four stat tiles: views, unique visitors, top source, top page
- Daily line chart of views
- Two tables: top pages, top sources
- Range toggle: 7 / 30 / 90 days

**`app/admin/page.tsx`** — a fifth count card, 30-day views, linking to the new page, so
the dashboard is the entry point rather than analytics being a separate silo.

**`app/admin/inquiries/page.tsx`** — inquiry cards with a `session_id` gain an expandable
"Journey" strip: ordered path list with timestamps, plus arrival source. Cards without one
render exactly as they do today — no empty states.

Analytics reads in the admin are wrapped so a failing RPC degrades that panel only,
leaving posts, jobs, applications, and inquiries working.

## Testing

Unit tests for the pure logic that is easy to get wrong and hard to eyeball:
source derivation from referrer/UTM, bot detection, device classification.

Manual verification pass: browse the public site and confirm rows land; submit a contact
form and confirm the journey attaches; confirm `/admin` and `/login` produce no rows.

## Out of scope

Realtime/live view, per-visitor identity or company lookup, funnels, retention cohorts,
CSV export. Flagged as decisions, not oversights.
