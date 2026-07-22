# First-Party Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture anonymous page views on the public site and surface both traffic stats and per-lead journeys in `/admin`.

**Architecture:** A client component in the public layout beacons each route change to `POST /api/track`, which filters bots, derives device/country from request headers, and inserts into `page_views` via the service-role client. Contact and discovery forms send the same sessionStorage ID so an inquiry can be joined to the pages that preceded it. The admin reads aggregates through one Postgres function.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Tailwind v4, Vitest.

## Global Constraints

- **Database is already migrated.** `page_views` and `inquiries.session_id` exist (commit `7259598`); `lib/database.types.ts` is current. Do not re-create them.
- **`/api/track` returns `204` on every path** — success, validation failure, bot, rate-limit, and DB error alike. It must never surface an error to a visitor or trigger a retry.
- **Never store IP or raw user-agent.** Derive `device`/`country` at write time and discard the raw values.
- **Analytics must never break lead capture.** A missing/malformed session ID is ignored, never rejected.
- **Session IDs live in `sessionStorage` only** — never localStorage, never a cookie.
- **Staging rows must be tagged.** `is_staging` mirrors `lib/forms.ts:29` — true when `process.env.STAGING_PASSWORD` is set.
- **No new runtime dependencies.** Vitest is a devDependency; the chart is hand-rolled CSS.
- Existing style: double quotes, no semicolon-free style (semicolons on), `@/` path alias, `cn()` from `@/lib/cn` for class merging.

---

### Task 1: Test harness + pure parsing logic

**Files:**
- Create: `lib/analytics/parse.ts`
- Create: `lib/analytics/parse.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script + `vitest` devDependency)

**Interfaces:**
- Consumes: nothing.
- Produces: `isBot(ua: string | null): boolean`, `deviceFromUserAgent(ua: string | null): Device`, `referrerHost(referrer: string | null, siteHost: string): string | null`, `deriveSource(host: string | null, utmSource?: string | null): string`, `sanitizePath(raw: unknown): string | null`, `extractUtm(query: string): Record<string, string> | null`, `isUuid(v: unknown): v is string`, and `type Device = "mobile" | "tablet" | "desktop"`.

- [ ] **Step 1: Install Vitest and add the test script**

```bash
cd C:/Users/gilbert/ppl-solutions-revamp
npm install -D vitest
```

Then add to `package.json` `scripts` (keep the existing three):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

The `@/` alias must resolve or every test import fails.

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: { environment: "node", include: ["**/*.test.ts"] },
});
```

- [ ] **Step 3: Write the failing tests**

Create `lib/analytics/parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  isBot,
  deviceFromUserAgent,
  referrerHost,
  deriveSource,
  sanitizePath,
  extractUtm,
  isUuid,
} from "@/lib/analytics/parse";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

describe("isBot", () => {
  it("treats a missing or empty user-agent as a bot", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("   ")).toBe(true);
  });

  it("flags known crawlers and headless clients", () => {
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/120.0")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("python-requests/2.31.0")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("passes real browsers through", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });
});

describe("deviceFromUserAgent", () => {
  it("classifies desktop", () => {
    expect(deviceFromUserAgent(CHROME)).toBe("desktop");
  });

  it("classifies phones", () => {
    expect(deviceFromUserAgent(IPHONE)).toBe("mobile");
  });

  it("classifies tablets, including Android tablets lacking the Mobile token", () => {
    expect(deviceFromUserAgent(IPAD)).toBe("tablet");
    expect(deviceFromUserAgent(ANDROID_TABLET)).toBe("tablet");
  });

  it("falls back to desktop when the user-agent is absent", () => {
    expect(deviceFromUserAgent(null)).toBe("desktop");
  });
});

describe("referrerHost", () => {
  it("returns null for same-site navigation, ignoring the www prefix", () => {
    expect(
      referrerHost("https://www.pplsolutionsinc.com/about", "pplsolutionsinc.com"),
    ).toBeNull();
  });

  it("returns the external host", () => {
    expect(referrerHost("https://www.google.com/search?q=x", "pplsolutionsinc.com")).toBe(
      "www.google.com",
    );
  });

  it("returns null for absent or malformed referrers", () => {
    expect(referrerHost(null, "pplsolutionsinc.com")).toBeNull();
    expect(referrerHost("not a url", "pplsolutionsinc.com")).toBeNull();
  });
});

describe("deriveSource", () => {
  it("defaults to direct with no referrer", () => {
    expect(deriveSource(null)).toBe("direct");
  });

  it("maps known hosts to channel names", () => {
    expect(deriveSource("www.google.com")).toBe("google");
    expect(deriveSource("www.google.co.uk")).toBe("google");
    expect(deriveSource("www.linkedin.com")).toBe("linkedin");
    expect(deriveSource("lnkd.in")).toBe("linkedin");
    expect(deriveSource("m.facebook.com")).toBe("facebook");
  });

  it("falls back to the bare host for unknown referrers", () => {
    expect(deriveSource("www.someblog.dev")).toBe("someblog.dev");
  });

  it("lets an explicit utm_source win over the referrer", () => {
    expect(deriveSource("www.google.com", "newsletter")).toBe("newsletter");
  });

  it("ignores a blank utm_source", () => {
    expect(deriveSource("www.google.com", "  ")).toBe("google");
  });
});

describe("sanitizePath", () => {
  it("strips query and hash", () => {
    expect(sanitizePath("/services?utm_source=x#top")).toBe("/services");
  });

  it("rejects non-strings and anything not rooted at /", () => {
    expect(sanitizePath(42)).toBeNull();
    expect(sanitizePath("https://evil.com/x")).toBeNull();
    expect(sanitizePath("")).toBeNull();
  });

  it("caps absurdly long paths", () => {
    expect(sanitizePath("/" + "a".repeat(900))?.length).toBe(512);
  });
});

describe("extractUtm", () => {
  it("picks out only utm_ params", () => {
    expect(extractUtm("?utm_source=li&utm_campaign=q3&foo=bar")).toEqual({
      utm_source: "li",
      utm_campaign: "q3",
    });
  });

  it("returns null when there are none", () => {
    expect(extractUtm("?foo=bar")).toBeNull();
    expect(extractUtm("")).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts a v4 uuid and rejects anything else", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("nope")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/analytics/parse"`.

- [ ] **Step 5: Implement `lib/analytics/parse.ts`**

```ts
/**
 * Pure request-parsing helpers for analytics capture. No I/O, no Next imports —
 * everything here is unit-tested in parse.test.ts.
 */

export type Device = "mobile" | "tablet" | "desktop";

const BOT_RE =
  /bot|crawl|spider|slurp|headless|puppeteer|playwright|phantomjs|curl|wget|python-requests|axios|go-http-client|java\/|lighthouse|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petalbot|facebookexternalhit|embedly|preview|monitor|scan/i;

/** Absent user-agents are treated as bots: real browsers always send one. */
export function isBot(ua: string | null): boolean {
  if (!ua || ua.trim() === "") return true;
  return BOT_RE.test(ua);
}

export function deviceFromUserAgent(ua: string | null): Device {
  if (!ua) return "desktop";
  // Tablets first: an Android tablet looks like a phone minus the Mobile token.
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

const stripWww = (host: string) => host.replace(/^www\./, "");

/** External referrer host, or null for same-site navigation / bad input. */
export function referrerHost(
  referrer: string | null,
  siteHost: string,
): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (stripWww(host) === stripWww(siteHost.toLowerCase())) return null;
  return host;
}

const SOURCE_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\./, "bing"],
  [/(^|\.)duckduckgo\./, "duckduckgo"],
  [/(^|\.)yahoo\./, "yahoo"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)fb\.com$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)t\.co$/, "x"],
  [/(^|\.)x\.com$/, "x"],
];

export function deriveSource(
  host: string | null,
  utmSource?: string | null,
): string {
  if (utmSource && utmSource.trim()) {
    return utmSource.trim().toLowerCase().slice(0, 64);
  }
  if (!host) return "direct";
  for (const [re, name] of SOURCE_HOSTS) {
    if (re.test(host)) return name;
  }
  return stripWww(host);
}

const MAX_PATH = 512;

export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  const path = trimmed.split(/[?#]/)[0];
  return path.length > MAX_PATH ? path.slice(0, MAX_PATH) : path;
}

export function extractUtm(query: string): Record<string, string> | null {
  if (!query) return null;
  const params = new URLSearchParams(
    query.startsWith("?") ? query.slice(1) : query,
  );
  const utm: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.startsWith("utm_") && value) utm[key] = value.slice(0, 128);
  }
  return Object.keys(utm).length ? utm : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/analytics/parse.ts lib/analytics/parse.test.ts
git commit -m "Add Vitest and analytics request-parsing helpers

Pure functions for bot detection, device classification, referrer-to-source
mapping, and path sanitisation, with the project's first test suite.

Absent user-agents count as bots because real browsers always send one, and
tablets are matched before phones since an Android tablet is a phone UA minus
the Mobile token.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Capture — track route and beacon component

**Files:**
- Create: `app/api/track/route.ts`
- Create: `lib/analytics/session.ts`
- Create: `components/Analytics.tsx`
- Modify: `app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `isBot`, `deviceFromUserAgent`, `referrerHost`, `deriveSource`, `sanitizePath`, `extractUtm`, `isUuid` from `@/lib/analytics/parse`; `getServiceClient()` from `@/lib/supabase/service`; `rateLimit`, `clientIp` from `@/lib/rateLimit`.
- Produces: `getSessionId(): string | null` from `@/lib/analytics/session` — used by Task 3 to attach a session to inquiries.

- [ ] **Step 1: Create `lib/analytics/session.ts`**

Client-safe, no React. Task 3 imports this too.

```ts
const KEY = "ppl_sid";

/**
 * Per-tab visitor id. sessionStorage so it dies with the tab — no cross-session
 * tracking, which is what lets us run without a consent banner.
 * Returns null when storage is unavailable (Safari private mode throws).
 */
export function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create `app/api/track/route.ts`**

```ts
import {
  deriveSource,
  deviceFromUserAgent,
  extractUtm,
  isBot,
  isUuid,
  referrerHost,
  sanitizePath,
} from "@/lib/analytics/parse";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/database.types";

/** Always 204: the tracker is invisible to visitors and must never retry. */
const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    if (!rateLimit(`track:${ip}`, { limit: 120, windowMs: 60_000 }).ok) {
      return noContent();
    }

    const ua = request.headers.get("user-agent");
    if (isBot(ua)) return noContent();

    const body = (await request.json()) as Record<string, unknown>;

    const path = sanitizePath(body.path);
    const sessionId = body.sessionId;
    if (!path || !isUuid(sessionId)) return noContent();

    const siteHost = new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com",
    ).hostname;

    const host = referrerHost(
      typeof body.referrer === "string" ? body.referrer : null,
      siteHost,
    );
    const utm = extractUtm(typeof body.query === "string" ? body.query : "");

    const supabase = getServiceClient();
    if (!supabase) return noContent();

    // IP and raw user-agent are intentionally never persisted.
    const { error } = await supabase.from("page_views").insert({
      session_id: sessionId,
      path,
      referrer: host,
      source: deriveSource(host, utm?.utm_source),
      utm: (utm as Json) ?? null,
      device: deviceFromUserAgent(ua),
      country: request.headers.get("x-vercel-ip-country"),
      is_staging: Boolean(process.env.STAGING_PASSWORD),
    });
    if (error) console.error("[track] insert failed:", error.message);
  } catch (err) {
    console.error("[track] unexpected error:", err);
  }
  return noContent();
}
```

- [ ] **Step 3: Create `components/Analytics.tsx`**

Note: this reads `window.location.search` rather than `useSearchParams()` on purpose — `useSearchParams` forces a Suspense boundary and opts the whole public layout out of static rendering.

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSessionId } from "@/lib/analytics/session";

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const payload = JSON.stringify({
        sessionId,
        path: pathname,
        query: window.location.search,
        referrer: document.referrer || null,
      });

      // sendBeacon survives the page being unloaded and never blocks nav.
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" }),
      );
    } catch {
      // Analytics must never break the page.
    }
  }, [pathname]);

  return null;
}
```

- [ ] **Step 4: Mount it in the public layout only**

Modify `app/(site)/layout.tsx`. Mounting here rather than the root layout keeps `/admin` and `/login` untracked, so staff clicks never pollute the numbers.

```tsx
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Analytics />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Verify capture end to end**

```bash
npm run dev
```

Visit `http://localhost:3000/`, then `/about`, then `/services`. Then confirm rows landed:

```sql
select path, source, device, is_staging, created_at
from page_views order by created_at desc limit 10;
```

Expected: three rows, one per path, sharing one `session_id`, `source = 'direct'`, `device = 'desktop'`.

Now visit `http://localhost:3000/admin` and `/login`, re-run the query.
Expected: still three rows — no admin paths.

- [ ] **Step 6: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/api/track/route.ts lib/analytics/session.ts components/Analytics.tsx "app/(site)/layout.tsx"
git commit -m "Capture anonymous page views via beacon endpoint

Analytics mounts in the (site) layout only, so /admin and /login stay
untracked and staff clicks never pollute the numbers. It reads
window.location.search rather than useSearchParams, which would force a
Suspense boundary and opt the public layout out of static rendering.

/api/track answers 204 on every path including validation and DB failure -
the tracker is invisible to visitors and must never surface an error or
retry. IP and raw user-agent are dropped after deriving device and country.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Link inquiries to sessions

**Files:**
- Modify: `lib/forms.ts` (`persistInquiry` signature)
- Modify: `app/api/contact/route.ts:72`
- Modify: `app/api/discovery/route.ts` (the `persistInquiry` call)
- Modify: `components/forms/ContactForm.tsx:21`
- Modify: `components/forms/DiscoveryForm.tsx` (its submit handler)

**Interfaces:**
- Consumes: `getSessionId()` from `@/lib/analytics/session`.
- Produces: `persistInquiry(type: InquiryType, payload: Record<string, unknown>, sessionId?: string | null): Promise<void>` — `inquiries.session_id` is populated for Task 6 to read.

Note: there is no referral form or `/api/referral` route in this codebase. Only contact and discovery exist.

- [ ] **Step 1: Widen `persistInquiry` to accept a session**

In `lib/forms.ts`, add the `isUuid` import and replace the function:

```ts
import { isUuid } from "@/lib/analytics/parse";
```

```ts
/** Best-effort persistence to the inquiries table; never throws. */
export async function persistInquiry(
  type: InquiryType,
  payload: Record<string, unknown>,
  sessionId?: string | null,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.warn(`[inquiry:${type}] skipped persistence (Supabase not configured)`);
    return;
  }
  // Staging shares the production database, so mark test rows to make them
  // separable at cutover. Unset in production, so real rows carry no flag.
  const tagged = process.env.STAGING_PASSWORD
    ? { ...payload, _staging: true }
    : payload;

  const { error } = await supabase.from("inquiries").insert({
    type,
    payload: tagged as Json,
    // Ignore anything malformed: analytics must never block lead capture.
    session_id: isUuid(sessionId) ? sessionId : null,
  });
  if (error) console.error(`[inquiry:${type}] insert failed:`, error.message);
}
```

- [ ] **Step 2: Pass the session through the contact route**

In `app/api/contact/route.ts`, `sessionId` arrives in the body but must stay out of `payload` — `admin/inquiries/page.tsx` renders payload entries generically and a raw UUID would show as a junk field.

Replace line 72:

```ts
  await persistInquiry("contact", payload, body.sessionId as string | undefined);
```

- [ ] **Step 3: Pass the session through the discovery route**

In `app/api/discovery/route.ts`, replace line 66. The request body is bound to `b` in this route, and `payload` is built field-by-field, so `sessionId` cannot leak into it:

```ts
  await persistInquiry("discovery", payload, b.sessionId as string | undefined);
```

- [ ] **Step 4: Send the session from the contact form**

In `components/forms/ContactForm.tsx`, add the import:

```tsx
import { getSessionId } from "@/lib/analytics/session";
```

and replace line 21:

```tsx
    const data = {
      ...Object.fromEntries(new FormData(form).entries()),
      sessionId: getSessionId(),
    };
```

- [ ] **Step 5: Send the session from the discovery form**

In `components/forms/DiscoveryForm.tsx`, add the import:

```tsx
import { getSessionId } from "@/lib/analytics/session";
```

The submit handler builds a `payload` object that closes at line 80 (`};`) just before the `fetch` to `/api/discovery`. Add one final entry to that object:

```tsx
      sessionId: getSessionId(),
```

- [ ] **Step 6: Verify the link**

With `npm run dev` running, browse `/` → `/services` → `/contact`, then submit the contact form.

```sql
select i.type, i.session_id, count(pv.id) as views
from inquiries i
left join page_views pv on pv.session_id = i.session_id
where i.session_id is not null
group by 1, 2 order by 1;
```

Expected: one row, `views` = 3.

Then confirm the fallback: in DevTools run `sessionStorage.clear()`, disable JS, submit again — the inquiry must still save with `session_id` null.

- [ ] **Step 7: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add lib/forms.ts app/api/contact/route.ts app/api/discovery/route.ts components/forms/ContactForm.tsx components/forms/DiscoveryForm.tsx
git commit -m "Attach visit session to contact and discovery inquiries

persistInquiry takes an optional session id and drops anything that is not a
uuid - a blocked tracker or failed JS must never stop a lead being saved. The
id goes in its own column rather than the payload, since the inquiries admin
renders payload entries generically and a raw uuid would surface as junk.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Aggregation function and query layer

**Files:**
- Create: `lib/analytics/queries.ts`
- Apply: Supabase migration `add_analytics_summary_function`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`.
- Produces: `getAnalyticsSummary(days: number): Promise<AnalyticsSummary | null>`, `getJourneys(sessionIds: string[]): Promise<Map<string, JourneyStep[]>>`, and the exported types `AnalyticsSummary`, `JourneyStep`.

- [ ] **Step 1: Apply the aggregation migration**

Use the Supabase MCP `apply_migration` tool, name `add_analytics_summary_function`:

```sql
-- Aggregation stays in Postgres: reducing raw rows in JS works at 500 rows
-- and falls over at 50,000.
create or replace function public.analytics_summary(days int default 30)
returns json
language sql
stable
as $$
  with scoped as (
    select * from public.page_views
    where is_staging = false
      and created_at >= now() - make_interval(days => days)
  )
  select json_build_object(
    'views', (select count(*) from scoped),
    'visitors', (select count(distinct session_id) from scoped),
    'daily', coalesce((select json_agg(t) from (
      select date_trunc('day', created_at)::date as day, count(*)::int as views
      from scoped group by 1 order by 1) t), '[]'::json),
    'top_pages', coalesce((select json_agg(t) from (
      select path, count(*)::int as views
      from scoped group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'top_sources', coalesce((select json_agg(t) from (
      select coalesce(source, 'direct') as source, count(*)::int as views
      from scoped group by 1 order by 2 desc, 1 limit 10) t), '[]'::json),
    'devices', coalesce((select json_agg(t) from (
      select coalesce(device, 'unknown') as device, count(*)::int as views
      from scoped group by 1 order by 2 desc, 1) t), '[]'::json)
  );
$$;

-- Security invoker (the default): the caller's RLS applies, so only
-- authenticated staff can read. Do not make this security definer.
revoke all on function public.analytics_summary(int) from public, anon;
grant execute on function public.analytics_summary(int) to authenticated;
```

- [ ] **Step 2: Verify the function returns the expected shape**

Run via the Supabase MCP `execute_sql`:

```sql
select public.analytics_summary(30);
```

Expected: a JSON object with keys `views`, `visitors`, `daily`, `top_pages`, `top_sources`, `devices`. Empty arrays are fine; the keys must all be present.

- [ ] **Step 3: Regenerate the database types**

Run the Supabase MCP `generate_typescript_types` tool. `lib/database.types.ts` is a hand-trimmed variant of the generator output — do **not** paste the full output over it. Instead add the function signature by hand, replacing the existing `Functions: { [_ in never]: never }` line in `lib/database.types.ts`:

```ts
    Functions: {
      analytics_summary: {
        Args: { days: number }
        Returns: Json
      }
    }
```

- [ ] **Step 4: Create `lib/analytics/queries.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export type AnalyticsSummary = {
  views: number;
  visitors: number;
  daily: Array<{ day: string; views: number }>;
  top_pages: Array<{ path: string; views: number }>;
  top_sources: Array<{ source: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
};

export type JourneyStep = {
  path: string;
  source: string | null;
  created_at: string;
};

/** Returns null on failure so a broken panel degrades instead of 500ing /admin. */
export async function getAnalyticsSummary(
  days: number,
): Promise<AnalyticsSummary | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("analytics_summary", { days });
    if (error) {
      console.error("[analytics] summary failed:", error.message);
      return null;
    }
    return data as unknown as AnalyticsSummary;
  } catch (err) {
    console.error("[analytics] summary threw:", err);
    return null;
  }
}

/** Ordered page views per session, keyed by session id. */
export async function getJourneys(
  sessionIds: string[],
): Promise<Map<string, JourneyStep[]>> {
  const journeys = new Map<string, JourneyStep[]>();
  if (!sessionIds.length) return journeys;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("page_views")
      .select("session_id, path, source, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[analytics] journeys failed:", error.message);
      return journeys;
    }

    for (const row of data ?? []) {
      const steps = journeys.get(row.session_id) ?? [];
      steps.push({
        path: row.path,
        source: row.source,
        created_at: row.created_at,
      });
      journeys.set(row.session_id, steps);
    }
  } catch (err) {
    console.error("[analytics] journeys threw:", err);
  }
  return journeys;
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/queries.ts lib/database.types.ts
git commit -m "Add analytics_summary aggregation and admin query layer

One Postgres function returns totals, daily series, top pages, top sources,
and device split as a single JSON object - one round trip, and aggregation
stays where the data is. It runs security invoker so staff-only RLS applies.

Both query helpers swallow errors and degrade to null/empty, so a failing
analytics read never takes down the rest of /admin.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Analytics dashboard page

**Files:**
- Create: `app/admin/analytics/page.tsx`
- Create: `components/admin/ViewsChart.tsx`
- Modify: `components/admin/AdminNav.tsx:14-20`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `getAnalyticsSummary`, `AnalyticsSummary` from `@/lib/analytics/queries`.
- Produces: the `/admin/analytics` route, linked from nav and dashboard.

- [ ] **Step 1: Load the dataviz skill before writing the chart**

Invoke the `dataviz` skill. The chart below is a dependency-free CSS bar chart; follow the skill's guidance on axis, label, and colour treatment when finalising it.

- [ ] **Step 2: Create `components/admin/ViewsChart.tsx`**

A hand-rolled bar chart — no chart library, keeping the no-new-runtime-deps constraint.

```tsx
type Props = { data: Array<{ day: string; views: number }> };

export function ViewsChart({ data }: Props) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-charcoal/50">
        No views recorded in this period yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.views));

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-end gap-1" style={{ height: 180 }}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex flex-col items-center">
            <div
              className="w-3 rounded-t bg-gradient-to-t from-grad-from to-grad-to transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max((d.views / max) * 160, 2)}px` }}
            />
            <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {d.views} on {d.day}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-charcoal/50">
        <span>{data[0].day}</span>
        <span>{data[data.length - 1].day}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/analytics/page.tsx`**

```tsx
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getAnalyticsSummary } from "@/lib/analytics/queries";
import { ViewsChart } from "@/components/admin/ViewsChart";

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = RANGES.includes(Number(raw)) ? Number(raw) : 30;
  const summary = await getAnalyticsSummary(days);

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
    </div>
  );
}
```

- [ ] **Step 4: Add the nav entry**

In `components/admin/AdminNav.tsx`, add `BarChart3` to the lucide import and insert the item after Dashboard:

```tsx
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
```

- [ ] **Step 5: Add the dashboard card**

In `app/admin/page.tsx`, import `getAnalyticsSummary` and `BarChart3`, then add a fifth card so the dashboard is the entry point rather than analytics being a silo. Fetch the summary alongside the existing counts:

```tsx
  const [posts, jobs, applications, inquiries, summary] = await Promise.all([
    count("posts"),
    count("jobs"),
    count("applications"),
    count("inquiries"),
    getAnalyticsSummary(30),
  ]);
```

and append to `cards`:

```tsx
    {
      label: "Views (30d)",
      value: summary?.views ?? 0,
      href: "/admin/analytics",
      icon: BarChart3,
    },
```

Change the grid class on the cards wrapper from `lg:grid-cols-4` to `lg:grid-cols-5`.

- [ ] **Step 6: Verify**

Run `npm run dev`, log in, visit `/admin/analytics`. Confirm: tiles populate, the chart renders, the 7/30/90 toggle changes the numbers, and the nav entry highlights. Check `/admin` shows the fifth card.

- [ ] **Step 7: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add app/admin/analytics/page.tsx components/admin/ViewsChart.tsx components/admin/AdminNav.tsx app/admin/page.tsx
git commit -m "Add analytics dashboard page

Stat tiles, a daily views chart, and top pages/sources tables with a 7/30/90
day toggle, plus a views card on the dashboard so analytics is reachable from
the existing entry point.

The chart is hand-rolled CSS rather than a charting library - a bar per day
does not justify a runtime dependency. A failed summary renders an
unavailable notice instead of taking down /admin.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Lead journeys on the inquiries page

**Files:**
- Modify: `app/admin/inquiries/page.tsx`
- Create: `components/admin/JourneyStrip.tsx`

**Interfaces:**
- Consumes: `getJourneys`, `JourneyStep` from `@/lib/analytics/queries`.
- Produces: nothing downstream. Final task.

- [ ] **Step 1: Create `components/admin/JourneyStrip.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import type { JourneyStep } from "@/lib/analytics/queries";

export function JourneyStrip({ steps }: { steps: JourneyStep[] }) {
  if (!steps.length) return null;

  const arrivedFrom = steps[0].source ?? "direct";

  return (
    <details className="mt-4 border-t border-black/[0.06] pt-3">
      <summary className="cursor-pointer text-xs font-medium text-purple">
        Journey · {steps.length} page{steps.length === 1 ? "" : "s"} · via{" "}
        {arrivedFrom}
      </summary>
      <ol className="mt-3 space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <ArrowRight className="size-3 shrink-0 text-charcoal/30" />
            <span className="text-ink">{step.path}</span>
            <time className="text-charcoal/40">
              {new Date(step.created_at).toLocaleTimeString()}
            </time>
          </li>
        ))}
      </ol>
    </details>
  );
}
```

- [ ] **Step 2: Wire it into the inquiries page**

In `app/admin/inquiries/page.tsx`, add the imports:

```tsx
import { getJourneys } from "@/lib/analytics/queries";
import { JourneyStrip } from "@/components/admin/JourneyStrip";
```

After the inquiries query, fetch journeys in one batched call:

```tsx
  const sessionIds = (inquiries ?? [])
    .map((i) => i.session_id)
    .filter((id): id is string => Boolean(id));
  const journeys = await getJourneys(sessionIds);
```

Then inside the card, immediately after the closing `</dl>`:

```tsx
                {inq.session_id && (
                  <JourneyStrip steps={journeys.get(inq.session_id) ?? []} />
                )}
```

- [ ] **Step 3: Verify**

With `npm run dev`, browse `/` → `/services` → `/contact` and submit the form. Open `/admin/inquiries`.

Expected: the new inquiry shows a "Journey · 3 pages · via direct" toggle that expands to the ordered path list. Older inquiries with no `session_id` render exactly as before, with no strip and no empty state.

- [ ] **Step 4: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all clean.

- [ ] **Step 5: Update the spec's form count**

In `docs/superpowers/specs/2026-07-22-first-party-analytics-design.md`, change "The contact, discovery, and referral forms" to "The contact and discovery forms" — there is no referral form in this codebase.

- [ ] **Step 6: Commit**

```bash
git add app/admin/inquiries/page.tsx components/admin/JourneyStrip.tsx docs/superpowers/specs/2026-07-22-first-party-analytics-design.md
git commit -m "Show the page journey behind each inquiry

Inquiries with a session id gain a collapsible strip listing the pages that
visitor viewed before submitting, plus how they arrived. Journeys are fetched
in one batched query rather than per card. Inquiries without a session render
exactly as before - no empty states.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Post-implementation verification

Run through this before calling the feature done:

1. `npm test` — all suites pass.
2. `npx tsc --noEmit` — no errors.
3. `npm run build` — production build succeeds.
4. Browse the public site in a fresh tab; confirm one row per page in `page_views`, all sharing a session id.
5. Visit `/admin` and `/login`; confirm no new rows.
6. Submit the contact form; confirm the journey appears in `/admin/inquiries`.
7. Confirm `select count(*) from page_views where is_staging = true` is non-zero locally (STAGING_PASSWORD set) and that `/admin/analytics` excludes those rows.
8. `curl -X POST localhost:3000/api/track -H 'user-agent: Googlebot/2.1' -d '{}'` → returns 204, writes nothing.
