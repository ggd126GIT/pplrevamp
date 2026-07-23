# Interaction Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record which page sections visitors actually reach, plus a thin allowlist of clicks, and surface both in `/admin/analytics`.

**Architecture:** A new `events` table receives batched writes from a client queue that flushes via `sendBeacon` on page hide and on client-side route change. An `IntersectionObserver` fires one `section_view` per `(session, path, section)`; a delegated click listener emits only on an allowlist. All decision logic lives in pure, unit-tested functions; the browser wiring is a thin wrapper.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-23-interaction-events-design.md`

## Global Constraints

- **Analytics must never break the page.** Every client capture path is wrapped in `try/catch` that swallows.
- **`/api/events` always returns 204**, on every path including validation failure and insert error. The tracker must never retry.
- **No new PII.** Store only `path`, `label`, and optionally an outbound `href`. Never IP, never raw user-agent.
- **RLS mirrors `page_views` exactly:** `for select to authenticated using (true)`. **No anon insert** — all writes go through the service-role client.
- **SQL functions are SECURITY INVOKER** (the default). Never `SECURITY DEFINER` — RLS is what keeps analytics staff-only.
- **Vitest runs in `environment: "node"`** with `include: ["**/*.test.ts"]`. Tested code must not touch the DOM.
- **Existing metrics are untouchable.** `analytics_summary()` and the `page_views` table must not change behaviour.
- Tests colocate next to source as `<name>.test.ts`. Run with `npm test`.
- `lib/database.types.ts` is generated — never hand-edit it.

---

### Task 1: Database — `events` table

**Files:**
- Modify: `lib/database.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: nothing
- Produces: `events` table with columns `(id, session_id, type, label, path, meta, is_staging, created_at)`; `Database["public"]["Tables"]["events"]` in the generated types.

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `apply_migration` with name `add_events_table`:

```sql
create table public.events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null,
  type        text not null check (type in ('section_view','click')),
  label       text not null,
  path        text not null,
  meta        jsonb,
  is_staging  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index events_created_at_idx on public.events (created_at desc);
create index events_session_idx    on public.events (session_id);
create index events_lookup_idx     on public.events (type, path, label);

alter table public.events enable row level security;

-- Mirrors the existing "page_views staff read" policy exactly.
create policy "events staff read"
  on public.events for select
  to authenticated
  using (true);
```

- [ ] **Step 2: Verify the table and its RLS**

Use the MCP tool `execute_sql`:

```sql
select
  (select count(*) from information_schema.columns
     where table_name = 'events' and table_schema = 'public') as cols,
  (select relrowsecurity from pg_class where relname = 'events') as rls_on,
  (select count(*) from pg_policies where tablename = 'events') as policies;
```

Expected: `cols = 8`, `rls_on = true`, `policies = 1`.

- [ ] **Step 3: Regenerate the TypeScript types**

Use the MCP tool `generate_typescript_types` and write its output verbatim over `lib/database.types.ts`.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/database.types.ts
git commit -m "Add events table for interaction tracking"
```

---

### Task 2: Batch validation — `normalizeEventBatch`

**Files:**
- Modify: `lib/analytics/parse.ts`
- Test: `lib/analytics/parse.test.ts`

**Interfaces:**
- Consumes: existing `sanitizePath(raw: unknown): string | null` and `isUuid(v: unknown): v is string` from the same file.
- Produces:
  ```ts
  export type EventType = "section_view" | "click";
  export type NormalizedEvent = {
    type: EventType;
    label: string;
    path: string;
    meta: { href: string } | null;
  };
  export function normalizeEventBatch(body: unknown):
    { sessionId: string; events: NormalizedEvent[] } | null;
  ```
  Returns `null` when the batch is unusable (bad `sessionId`, or zero valid events).

- [ ] **Step 1: Write the failing tests**

Append to `lib/analytics/parse.test.ts`:

```ts
describe("normalizeEventBatch", () => {
  const SID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const ok = { type: "section_view", label: "threeds", path: "/" };

  it("accepts a valid batch", () => {
    expect(normalizeEventBatch({ sessionId: SID, events: [ok] })).toEqual({
      sessionId: SID,
      events: [{ type: "section_view", label: "threeds", path: "/", meta: null }],
    });
  });

  it("rejects a batch with a bad session id or no events", () => {
    expect(normalizeEventBatch({ sessionId: "nope", events: [ok] })).toBeNull();
    expect(normalizeEventBatch({ sessionId: SID, events: [] })).toBeNull();
    expect(normalizeEventBatch(null)).toBeNull();
    expect(normalizeEventBatch({ sessionId: SID })).toBeNull();
  });

  it("drops invalid events but keeps the valid remainder", () => {
    const batch = normalizeEventBatch({
      sessionId: SID,
      events: [
        { type: "bogus", label: "x", path: "/" },
        { type: "click", label: "", path: "/" },
        { type: "click", label: "cta", path: "not-a-path" },
        ok,
      ],
    });
    expect(batch?.events).toHaveLength(1);
    expect(batch?.events[0].label).toBe("threeds");
  });

  it("caps the batch at 50 events", () => {
    const many = Array.from({ length: 80 }, () => ok);
    expect(normalizeEventBatch({ sessionId: SID, events: many })?.events)
      .toHaveLength(50);
  });

  it("trims and caps label length", () => {
    const batch = normalizeEventBatch({
      sessionId: SID,
      events: [{ ...ok, label: "  " + "a".repeat(200) + "  " }],
    });
    expect(batch?.events[0].label).toHaveLength(64);
  });

  it("keeps a meta href, capped, and ignores other meta keys", () => {
    const batch = normalizeEventBatch({
      sessionId: SID,
      events: [
        { type: "click", label: "outbound", path: "/", meta: { href: "https://x.com/a", evil: "y" } },
        { type: "click", label: "outbound", path: "/", meta: { href: "h".repeat(900) } },
      ],
    });
    expect(batch?.events[0].meta).toEqual({ href: "https://x.com/a" });
    expect(batch?.events[1].meta?.href).toHaveLength(512);
  });

  it("strips query strings from event paths", () => {
    const batch = normalizeEventBatch({
      sessionId: SID,
      events: [{ ...ok, path: "/services?utm_source=li" }],
    });
    expect(batch?.events[0].path).toBe("/services");
  });
});
```

Add `normalizeEventBatch` to the existing import block at the top of the file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `normalizeEventBatch is not a function`.

- [ ] **Step 3: Implement**

Append to `lib/analytics/parse.ts`:

```ts
export type EventType = "section_view" | "click";

export type NormalizedEvent = {
  type: EventType;
  label: string;
  path: string;
  meta: { href: string } | null;
};

const EVENT_TYPES: EventType[] = ["section_view", "click"];
const MAX_EVENTS_PER_BATCH = 50;
const MAX_LABEL = 64;
const MAX_HREF = 512;

/**
 * Validates a client event batch. Individual bad events are dropped rather than
 * rejecting the batch — one malformed entry must not lose a whole page's data.
 * Returns null only when nothing usable survives.
 */
export function normalizeEventBatch(
  body: unknown,
): { sessionId: string; events: NormalizedEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const { sessionId, events } = body as Record<string, unknown>;
  if (!isUuid(sessionId) || !Array.isArray(events)) return null;

  const normalized: NormalizedEvent[] = [];
  for (const raw of events.slice(0, MAX_EVENTS_PER_BATCH)) {
    if (!raw || typeof raw !== "object") continue;
    const { type, label, path, meta } = raw as Record<string, unknown>;

    if (!EVENT_TYPES.includes(type as EventType)) continue;

    const cleanLabel =
      typeof label === "string" ? label.trim().slice(0, MAX_LABEL) : "";
    if (!cleanLabel) continue;

    const cleanPath = sanitizePath(path);
    if (!cleanPath) continue;

    // Only href survives from meta; anything else the client sends is ignored.
    const href =
      meta && typeof meta === "object"
        ? (meta as Record<string, unknown>).href
        : undefined;

    normalized.push({
      type: type as EventType,
      label: cleanLabel,
      path: cleanPath,
      meta: typeof href === "string" && href ? { href: href.slice(0, MAX_HREF) } : null,
    });
  }

  return normalized.length ? { sessionId, events: normalized } : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (34 existing + 7 new = 41).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/parse.ts lib/analytics/parse.test.ts
git commit -m "Add event batch validation"
```

---

### Task 3: Ingest route — `/api/events`

**Files:**
- Create: `app/api/events/route.ts`

**Interfaces:**
- Consumes: `normalizeEventBatch` (Task 2); existing `isBot`, `clientIp`, `rateLimit`, `getServiceClient`.
- Produces: `POST /api/events` accepting `{ sessionId, events: [{ type, label, path, meta }] }`, always `204`.

- [ ] **Step 1: Write the route**

Create `app/api/events/route.ts`. This mirrors `app/api/track/route.ts` deliberately — same bot filter, same always-204 contract.

```ts
import { isBot, normalizeEventBatch } from "@/lib/analytics/parse";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/database.types";

/** Always 204: the tracker is invisible to visitors and must never retry. */
const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    // Batched, so one request per page view — a lower ceiling than /api/track.
    if (!rateLimit(`events:${ip}`, { limit: 30, windowMs: 60_000 }).ok) {
      return noContent();
    }

    if (isBot(request.headers.get("user-agent"))) return noContent();

    const batch = normalizeEventBatch(await request.json());
    if (!batch) return noContent();

    const supabase = getServiceClient();
    if (!supabase) return noContent();

    const isStaging = Boolean(process.env.STAGING_PASSWORD);
    const { error } = await supabase.from("events").insert(
      batch.events.map((e) => ({
        session_id: batch.sessionId,
        type: e.type,
        label: e.label,
        path: e.path,
        meta: (e.meta as Json) ?? null,
        is_staging: isStaging,
      })),
    );
    if (error) console.error("[events] insert failed:", error.message);
  } catch (err) {
    console.error("[events] unexpected error:", err);
  }
  return noContent();
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the route responds 204 end-to-end**

Start the dev server (`npm run dev`), then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36' \
  -d '{"sessionId":"3f2504e0-4f89-41d3-9a0c-0305e82c3301","events":[{"type":"section_view","label":"threeds","path":"/"}]}'
```

Expected: `204`.

Then confirm the row landed, using the MCP tool `execute_sql`:

```sql
select type, label, path, is_staging from public.events order by id desc limit 1;
```

Expected: one row — `section_view | threeds | / `.

Clean up the probe row:

```sql
delete from public.events where label = 'threeds' and session_id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
```

- [ ] **Step 4: Commit**

```bash
git add app/api/events/route.ts
git commit -m "Add /api/events batch ingest route"
```

---

### Task 4: Client event queue

**Files:**
- Create: `lib/analytics/events.ts`

**Interfaces:**
- Consumes: existing `getSessionId(): string | null` from `lib/analytics/session.ts`.
- Produces:
  ```ts
  export type QueuedEvent = {
    type: "section_view" | "click";
    label: string;
    path: string;
    meta?: { href: string };
  };
  export function queueEvent(
    type: QueuedEvent["type"], label: string, path: string, meta?: { href: string },
  ): void;
  export function flush(): void;
  ```

- [ ] **Step 1: Write the queue**

Create `lib/analytics/events.ts`:

```ts
import { getSessionId } from "@/lib/analytics/session";

export type QueuedEvent = {
  type: "section_view" | "click";
  label: string;
  /** Recorded per event, not per batch: a flush and a route change can
   *  interleave, and a batch-level path would mislabel one page as another. */
  path: string;
  meta?: { href: string };
};

const MAX_QUEUE = 50;
let queue: QueuedEvent[] = [];

export function queueEvent(
  type: QueuedEvent["type"],
  label: string,
  path: string,
  meta?: { href: string },
): void {
  if (queue.length >= MAX_QUEUE) return;
  queue.push({ type, label, path, meta });
}

/** Sends and empties the queue. No-op when empty. Never throws. */
export function flush(): void {
  if (!queue.length) return;

  // Clear BEFORE sending: pagehide and visibilitychange can both fire for one
  // exit, and a queue still populated at that point would send twice.
  const events = queue;
  queue = [];

  try {
    const sessionId = getSessionId();
    if (!sessionId) return;
    const payload = JSON.stringify({ sessionId, events });
    navigator.sendBeacon(
      "/api/events",
      new Blob([payload], { type: "application/json" }),
    );
  } catch {
    // Analytics must never break the page.
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/events.ts
git commit -m "Add batched client event queue"
```

---

### Task 5: Pure capture logic — sections registry and click classification

**Files:**
- Create: `lib/analytics/sections.ts`
- Create: `lib/analytics/clicks.ts`
- Test: `lib/analytics/sections.test.ts`
- Test: `lib/analytics/clicks.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  // sections.ts
  export type SectionDef = { key: string; label: string };
  export const SECTION_RATIO = 0.5;
  export const SECTION_DWELL_MS = 1000;
  export const SECTION_REGISTRY: Record<string, SectionDef[]>;
  export function shouldFireSection(ratio: number, dwellMs: number): boolean;

  // clicks.ts
  export type ClickTarget = { trackAttr?: string | null; href?: string | null };
  export type ClickResult = { label: string; meta?: { href: string } } | null;
  export function classifyClick(target: ClickTarget, siteHost: string): ClickResult;
  ```

**Note:** `sections.ts` must contain **no DOM references** — the admin server component imports the registry, and Vitest runs in `environment: "node"`.

- [ ] **Step 1: Write the failing tests**

Create `lib/analytics/sections.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SECTION_REGISTRY,
  shouldFireSection,
  SECTION_DWELL_MS,
} from "@/lib/analytics/sections";

describe("shouldFireSection", () => {
  it("fires immediately once half the section is visible", () => {
    expect(shouldFireSection(0.5, 0)).toBe(true);
    expect(shouldFireSection(0.9, 0)).toBe(true);
  });

  it("fires on dwell even when barely visible", () => {
    expect(shouldFireSection(0.05, SECTION_DWELL_MS)).toBe(true);
  });

  it("does not fire on a fast scroll past", () => {
    expect(shouldFireSection(0.1, 200)).toBe(false);
    expect(shouldFireSection(0, 0)).toBe(false);
  });
});

describe("SECTION_REGISTRY", () => {
  it("covers the three tagged pages", () => {
    expect(Object.keys(SECTION_REGISTRY).sort()).toEqual([
      "/",
      "/about",
      "/services",
    ]);
  });

  it("uses unique keys within each page", () => {
    for (const defs of Object.values(SECTION_REGISTRY)) {
      const keys = defs.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
```

Create `lib/analytics/clicks.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyClick } from "@/lib/analytics/clicks";

const HOST = "www.pplsolutionsinc.com";

describe("classifyClick", () => {
  it("prefers an explicit data-track-click label", () => {
    expect(classifyClick({ trackAttr: "cta-contact", href: "/contact" }, HOST))
      .toEqual({ label: "cta-contact" });
  });

  it("classifies mailto and tel links", () => {
    expect(classifyClick({ href: "mailto:sales@pplsolutionsinc.com" }, HOST))
      .toEqual({ label: "email", meta: { href: "mailto:sales@pplsolutionsinc.com" } });
    expect(classifyClick({ href: "tel:+6321234567" }, HOST))
      .toEqual({ label: "phone", meta: { href: "tel:+6321234567" } });
  });

  it("classifies external links as outbound", () => {
    expect(classifyClick({ href: "https://www.linkedin.com/in/x" }, HOST))
      .toEqual({ label: "outbound", meta: { href: "https://www.linkedin.com/in/x" } });
  });

  it("ignores internal links, absolute or relative, www or not", () => {
    expect(classifyClick({ href: "/about" }, HOST)).toBeNull();
    expect(classifyClick({ href: "https://www.pplsolutionsinc.com/about" }, HOST)).toBeNull();
    expect(classifyClick({ href: "https://pplsolutionsinc.com/about" }, HOST)).toBeNull();
  });

  it("ignores clicks on nothing trackable", () => {
    expect(classifyClick({}, HOST)).toBeNull();
    expect(classifyClick({ href: "" }, HOST)).toBeNull();
    expect(classifyClick({ trackAttr: "   ", href: "" }, HOST)).toBeNull();
  });

  it("ignores unparseable and non-http schemes", () => {
    expect(classifyClick({ href: "javascript:void(0)" }, HOST)).toBeNull();
    expect(classifyClick({ href: "#top" }, HOST)).toBeNull();
  });

  it("caps an overlong track label", () => {
    expect(classifyClick({ trackAttr: "a".repeat(200) }, HOST)?.label).toHaveLength(64);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/analytics/sections` and `@/lib/analytics/clicks`.

- [ ] **Step 3: Implement `sections.ts`**

Create `lib/analytics/sections.ts`:

```ts
/**
 * Section registry and visibility rule. Pure data and logic only — no DOM
 * references, because the admin server component imports the registry and
 * Vitest runs in a node environment.
 */

export type SectionDef = { key: string; label: string };

/** Section is "seen" at >=50% visible, OR after 1s of any visibility. */
export const SECTION_RATIO = 0.5;
export const SECTION_DWELL_MS = 1000;

/**
 * Without the ratio rule, a section taller than the viewport could never
 * qualify. Without the dwell rule, fast scrolling inflates every number.
 */
export function shouldFireSection(ratio: number, dwellMs: number): boolean {
  return ratio >= SECTION_RATIO || dwellMs >= SECTION_DWELL_MS;
}

/**
 * Declared, not inferred from the data: a section nobody reached produces no
 * rows at all, so only this list lets the admin panel distinguish "0% reach"
 * from "not tracked". Zero reach is the finding this feature exists to surface.
 *
 * Order here is document order and drives the admin display.
 * Keys must match the `data-track-section` attributes added in Task 7.
 */
export const SECTION_REGISTRY: Record<string, SectionDef[]> = {
  "/": [
    { key: "hero", label: "Hero" },
    { key: "industries", label: "Industry expertise" },
    { key: "threeds", label: "3Ds framework" },
    { key: "threees", label: "3E's advantage" },
    { key: "cta", label: "Closing CTA" },
  ],
  "/about": [
    { key: "hero", label: "Hero" },
    { key: "intro", label: "Intro / 100 years" },
    { key: "leadership", label: "Leadership" },
    { key: "mvv", label: "Mission, vision, values" },
    { key: "cta", label: "Closing CTA" },
  ],
  "/services": [
    { key: "hero", label: "Hero" },
    { key: "offshoring", label: "What is offshoring" },
    { key: "offices", label: "Front / back office" },
    { key: "cta", label: "Closing CTA" },
  ],
};
```

- [ ] **Step 4: Implement `clicks.ts`**

Create `lib/analytics/clicks.ts`:

```ts
/**
 * Click classification. Deliberately an allowlist, not a full click map: a
 * click map is noise at this traffic volume and its selectors break on every
 * markup edit. Pure — takes plain values, not DOM nodes.
 */

export type ClickTarget = { trackAttr?: string | null; href?: string | null };
export type ClickResult = { label: string; meta?: { href: string } } | null;

const MAX_LABEL = 64;

const stripWww = (host: string) => host.replace(/^www\./, "");

export function classifyClick(
  { trackAttr, href }: ClickTarget,
  siteHost: string,
): ClickResult {
  // An explicit annotation always wins — it survives copy changes.
  const label = trackAttr?.trim().slice(0, MAX_LABEL);
  if (label) return { label };

  if (!href) return null;
  if (href.startsWith("mailto:")) return { label: "email", meta: { href } };
  if (href.startsWith("tel:")) return { label: "phone", meta: { href } };

  let url: URL;
  try {
    // Relative hrefs resolve against the site host, so they read as internal.
    url = new URL(href, `https://${siteHost}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (stripWww(url.hostname.toLowerCase()) === stripWww(siteHost.toLowerCase())) {
    return null;
  }
  return { label: "outbound", meta: { href } };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 41 existing + 12 new = 53 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/sections.ts lib/analytics/clicks.ts lib/analytics/sections.test.ts lib/analytics/clicks.test.ts
git commit -m "Add section registry and click classification"
```

---

### Task 6: Browser wiring — `InteractionTracker`

**Files:**
- Create: `components/analytics/InteractionTracker.tsx`
- Modify: `app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `queueEvent`, `flush` (Task 4); `shouldFireSection`, `SECTION_DWELL_MS` (Task 5); `classifyClick` (Task 5).
- Produces: `<InteractionTracker />` — a client component rendering `null`.

Both trackers live in one component because they share the flush lifecycle; splitting them would duplicate the `pagehide` / `visibilitychange` / route-change wiring.

- [ ] **Step 1: Write the component**

Create `components/analytics/InteractionTracker.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flush, queueEvent } from "@/lib/analytics/events";
import { classifyClick } from "@/lib/analytics/clicks";
import { SECTION_DWELL_MS, shouldFireSection } from "@/lib/analytics/sections";

/**
 * One section_view per (session, path, section). Module scope so it lives for
 * the tab: sections re-enter view constantly when scrolling back up, and
 * unchecked, one indecisive visitor reads as twelve.
 */
const seen = new Set<string>();

export function InteractionTracker() {
  const pathname = usePathname();

  // Section visibility. Rebuilt per path — the DOM is replaced on navigation.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const timers = new Map<Element, number>();

    const fire = (el: Element, key: string) => {
      seen.add(`${pathname}:${key}`);
      queueEvent("section_view", key, pathname);
      observer.unobserve(el);
      const timer = timers.get(el);
      if (timer) {
        window.clearTimeout(timer);
        timers.delete(el);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          const key = el.getAttribute("data-track-section");
          if (!key) continue;

          if (seen.has(`${pathname}:${key}`)) {
            observer.unobserve(el);
            continue;
          }

          if (!entry.isIntersecting) {
            const timer = timers.get(el);
            if (timer) {
              window.clearTimeout(timer);
              timers.delete(el);
            }
            continue;
          }

          if (shouldFireSection(entry.intersectionRatio, 0)) {
            fire(el, key);
          } else if (!timers.has(el)) {
            timers.set(
              el,
              window.setTimeout(() => fire(el, key), SECTION_DWELL_MS),
            );
          }
        }
      },
      { threshold: [0, 0.5] },
    );

    document
      .querySelectorAll("[data-track-section]")
      .forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname]);

  // Clicks — one delegated listener, allowlist only.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        const start = event.target as Element | null;
        if (!start?.closest) return;

        const tagged = start.closest("[data-track-click]");
        const anchor = start.closest("a[href]");
        if (!tagged && !anchor) return;

        const result = classifyClick(
          {
            trackAttr: tagged?.getAttribute("data-track-click"),
            href: anchor?.getAttribute("href"),
          },
          window.location.host,
        );
        if (result) {
          queueEvent("click", result.label, pathname, result.meta);
        }
      } catch {
        // Analytics must never break the page.
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Flush lifecycle. The cleanup flush is what covers client-side navigation:
  // the App Router never unloads between routes, so without it every event
  // from the previous page is silently discarded on internal navigation.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [pathname]);

  return null;
}
```

- [ ] **Step 2: Mount it**

In `app/(site)/layout.tsx`, find the existing `<Analytics />` mount and add the tracker immediately after it. Add the import alongside the existing `Analytics` import:

```tsx
import { InteractionTracker } from "@/components/analytics/InteractionTracker";
```

```tsx
<Analytics />
<InteractionTracker />
```

Mount it **only** in `app/(site)/layout.tsx`, never the root or admin layout, so `/admin` and `/login` are never tracked — matching the existing `Analytics` placement.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/InteractionTracker.tsx "app/(site)/layout.tsx"
git commit -m "Add interaction tracker component"
```

---

### Task 7: Tag the sections

**Files:**
- Modify: `components/ui/Section.tsx`
- Modify: `components/home/Hero.tsx:9`
- Modify: `components/home/IndustryMarquee.tsx:9`
- Modify: `components/home/ThreeDs.tsx:8`
- Modify: `components/home/ThreeEs.tsx:10`
- Modify: `components/CtaBand.tsx:41`
- Modify: `components/PageHero.tsx:18`
- Modify: `components/about/AboutIntro.tsx:258` and `:290`
- Modify: `components/about/MvvReveal.tsx:217`
- Modify: `components/services/IndustriesReveal.tsx:156` and its `svc-reveal-stage-wrap` div
- Modify: `components/services/ServicesToggle.tsx:47`
- Modify: `app/(site)/about/page.tsx:31`

**Interfaces:**
- Consumes: nothing at runtime; keys must match `SECTION_REGISTRY` from Task 5.
- Produces: `data-track-section` attributes in the DOM for the observer to find.

**Critical detail — the fallback pairs.** `AboutIntro` and `IndustriesReveal` each render **two** roots: a static `<section>` for mobile/reduced-motion and an animated stage wrapper for desktop, CSS-gated so only one is ever visible. **Tag both with the same key.** Deduplication makes this safe — whichever is visible fires, the other never does. Tagging only one would silently under-count on half of all devices.

**Do not restructure any markup.** Adding an attribute has zero layout effect; adding a wrapper element does not, and these components' GSAP pins are known to be fragile.

- [ ] **Step 1: Add a `trackSection` prop to the shared `Section` component**

`components/ui/Section.tsx` does not forward arbitrary props, so `/about`'s leadership section needs an explicit one. Modify it:

```tsx
export function Section({
  children,
  className,
  id,
  bg = "white",
  trackSection,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: "white" | "cream" | "mist" | "ink";
  trackSection?: string;
}) {
  return (
    <section
      id={id}
      data-track-section={trackSection}
      className={cn(
```

The rest of the file is unchanged.

- [ ] **Step 2: Tag the shared components**

`components/PageHero.tsx` line 18 — used by both `/about` and `/services`:
```tsx
<section data-track-section="hero" className="relative overflow-hidden bg-ink text-white">
```

`components/CtaBand.tsx` line 41 — used by all three pages:
```tsx
<section data-track-section="cta" className="bg-white py-16">
```

- [ ] **Step 3: Tag the home page sections**

`components/home/Hero.tsx` line 9:
```tsx
<section data-track-section="hero" className="relative overflow-hidden bg-ink text-white">
```

`components/home/IndustryMarquee.tsx` line 9:
```tsx
<section data-track-section="industries" className="border-y border-black/[0.06] bg-cream py-14">
```

`components/home/ThreeDs.tsx` line 8 — this one `<section>` already wraps both the static grid and `<ThreeDsPinned />`, so a single attribute covers both:
```tsx
<section id="threeds" data-track-section="threeds" className="relative z-10 bg-white py-20 sm:py-28">
```

`components/home/ThreeEs.tsx` line 10:
```tsx
<section
  id="threees"
  data-track-section="threees"
  className="relative z-20 -mt-24 rounded-t-[3rem] bg-mist py-20 shadow-[0_-30px_70px_-25px_rgba(147,82,161,0.35)] sm:py-28"
>
```

- [ ] **Step 4: Tag the about page sections**

`components/about/AboutIntro.tsx` — **both** roots, line 258:
```tsx
<section data-track-section="intro" className="about-intro-static bg-white py-20 sm:py-28">
```
and line 290:
```tsx
<div data-track-section="intro" className="about-intro-stage-wrap">
```

`app/(site)/about/page.tsx` line 31:
```tsx
<Section bg="white" trackSection="leadership" className="lg:pt-0 lg:pb-8">
```

`components/about/MvvReveal.tsx` line 217:
```tsx
<section
  ref={root}
  data-track-section="mvv"
  className="mvv-anim relative overflow-hidden bg-white pb-20 pt-8 sm:pb-28 sm:pt-10"
>
```

- [ ] **Step 5: Tag the services page sections**

`components/services/IndustriesReveal.tsx` — **both** roots, line 156:
```tsx
<section data-track-section="offshoring" className="svc-reveal-static bg-white py-20 sm:py-28">
```
and the stage wrapper:
```tsx
<div data-track-section="offshoring" className="svc-reveal-stage-wrap">
```

`components/services/ServicesToggle.tsx` line 47:
```tsx
<section
  data-track-section="offices"
  className={cn(
```

- [ ] **Step 6: Tag the primary CTA**

`components/CtaBand.tsx` line 87 — this is the site's main conversion button, rendered on all three tracked pages:

```tsx
              <Button href={buttonHref} size="lg" data-track-click="cta-band">
                {buttonLabel}
```

No change to `Button` is needed: it destructures its own props and spreads `...rest` onto the underlying `<a>`/`<Link>`, and its type extends `AnchorHTMLAttributes`, which permits `data-*` attributes. The attribute passes straight through.

Verify in the browser after Step 8: open `/`, inspect the CTA button, confirm `data-track-click="cta-band"` is on the rendered anchor.

- [ ] **Step 7: Verify every registry key has a matching attribute**

```bash
grep -rho 'data-track-section="[^"]*"' components app | sort -u
```

Expected — exactly these **ten** distinct values, which are the union of all `SECTION_REGISTRY` keys (each page uses a subset; `hero` and `cta` are shared):

`cta`, `hero`, `industries`, `intro`, `leadership`, `mvv`, `offices`, `offshoring`, `threeds`, `threees`

Any key present in `SECTION_REGISTRY` but missing here will render as a permanent 0% row in the admin panel — a silent wrong answer, not a visible error. Cross-check both directions.

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: clean build, 30+ routes.

- [ ] **Step 9: Commit**

```bash
git add components app
git commit -m "Tag tracked sections on home, about, and services"
```

---

### Task 8: Aggregation — `section_reach` SQL function and query layer

**Files:**
- Modify: `lib/analytics/queries.ts`
- Test: `lib/analytics/queries.test.ts` (create)

**Interfaces:**
- Consumes: `SECTION_REGISTRY`, `SectionDef` (Task 5).
- Produces:
  ```ts
  export type SectionReach = {
    sessions: Array<{ path: string; sessions: number }>;
    sections: Array<{ path: string; label: string; reached: number }>;
    clicks: Array<{ label: string; clicks: number }>;
  };
  export type ReachRow = { key: string; label: string; reached: number; pct: number };
  export async function getSectionReach(days: number): Promise<SectionReach | null>;
  export function reachRows(
    defs: SectionDef[], sessions: number, reached: Map<string, number>,
  ): ReachRow[];
  ```

**Critical detail — the denominator is distinct sessions, not page views.** Section events are deduplicated per `(session, path, section)`, so the numerator is inherently one-per-session. Dividing by raw page views would report 50% for a visitor who reloaded once and saw the section both times.

- [ ] **Step 1: Apply the SQL function**

Use the MCP tool `apply_migration` with name `add_section_reach_function`. SECURITY INVOKER (the default) — do not add `security definer`.

```sql
create or replace function public.section_reach(days integer default 30)
returns json
language sql
stable
as $$
  with window_start as (
    select now() - make_interval(days => days) as ts
  ),
  -- Denominator: distinct sessions per path, matching the per-session
  -- deduplication of section events.
  scoped_sessions as (
    select path, count(distinct session_id)::int as sessions
    from public.page_views, window_start
    where is_staging = false and created_at >= window_start.ts
    group by 1
  ),
  scoped_sections as (
    select path, label, count(distinct session_id)::int as reached
    from public.events, window_start
    where is_staging = false
      and type = 'section_view'
      and created_at >= window_start.ts
    group by 1, 2
  )
  select json_build_object(
    'sessions', coalesce((select json_agg(t) from (
      select path, sessions from scoped_sessions order by 1) t), '[]'::json),
    'sections', coalesce((select json_agg(t) from (
      select path, label, reached from scoped_sections order by 1, 2) t), '[]'::json),
    'clicks', coalesce((select json_agg(t) from (
      select label, count(*)::int as clicks
      from public.events, window_start
      where is_staging = false
        and type = 'click'
        and created_at >= window_start.ts
      group by 1 order by 2 desc, 1 limit 20) t), '[]'::json)
  );
$$;
```

- [ ] **Step 2: Verify the function runs and is INVOKER**

Use the MCP tool `execute_sql`:

```sql
select public.section_reach(30) is not null as runs,
       (select prosecdef from pg_proc where proname = 'section_reach') as is_definer;
```

Expected: `runs = true`, `is_definer = false`.

- [ ] **Step 3: Write the failing test for the percentage math**

Create `lib/analytics/queries.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reachRows } from "@/lib/analytics/queries";

const DEFS = [
  { key: "hero", label: "Hero" },
  { key: "threeds", label: "3Ds framework" },
];

describe("reachRows", () => {
  it("computes reach percentages against session count", () => {
    expect(reachRows(DEFS, 50, new Map([["hero", 50], ["threeds", 19]]))).toEqual([
      { key: "hero", label: "Hero", reached: 50, pct: 100 },
      { key: "threeds", label: "3Ds framework", reached: 19, pct: 38 },
    ]);
  });

  it("reports zero for a section with no events, rather than omitting it", () => {
    expect(reachRows(DEFS, 10, new Map([["hero", 10]]))[1]).toEqual({
      key: "threeds",
      label: "3Ds framework",
      reached: 0,
      pct: 0,
    });
  });

  it("does not divide by zero when there are no sessions", () => {
    expect(reachRows(DEFS, 0, new Map())[0].pct).toBe(0);
  });

  it("clamps above 100 so a data anomaly cannot break the bar width", () => {
    expect(reachRows(DEFS, 5, new Map([["hero", 9]]))[0].pct).toBe(100);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `reachRows is not a function`.

- [ ] **Step 5: Implement the query layer**

Append to `lib/analytics/queries.ts`, and add `import type { SectionDef } from "@/lib/analytics/sections";` to the top:

```ts
export type SectionReach = {
  sessions: Array<{ path: string; sessions: number }>;
  sections: Array<{ path: string; label: string; reached: number }>;
  clicks: Array<{ label: string; clicks: number }>;
};

export type ReachRow = {
  key: string;
  label: string;
  reached: number;
  pct: number;
};

/** Returns null on failure so a broken panel degrades instead of 500ing /admin. */
export async function getSectionReach(
  days: number,
): Promise<SectionReach | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("section_reach", { days });
    if (error) {
      console.error("[analytics] section reach failed:", error.message);
      return null;
    }
    return data as unknown as SectionReach;
  } catch (err) {
    console.error("[analytics] section reach threw:", err);
    return null;
  }
}

/**
 * Joins the declared registry to observed counts. Driven by `defs`, not by the
 * data, so a section nobody reached still appears — at 0%, which is the whole
 * point of the panel.
 */
export function reachRows(
  defs: SectionDef[],
  sessions: number,
  reached: Map<string, number>,
): ReachRow[] {
  return defs.map((def) => {
    const count = reached.get(def.key) ?? 0;
    return {
      key: def.key,
      label: def.label,
      reached: count,
      pct: sessions ? Math.min(100, Math.round((count / sessions) * 100)) : 0,
    };
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 53 + 4 = 57 tests.

- [ ] **Step 7: Regenerate types so the new RPC is known**

Use the MCP tool `generate_typescript_types` and write its output over `lib/database.types.ts`. Then run `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/analytics/queries.ts lib/analytics/queries.test.ts lib/database.types.ts
git commit -m "Add section reach aggregation"
```

---

### Task 9: Admin panel

**Files:**
- Create: `components/admin/SectionReachCard.tsx`
- Modify: `app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `getSectionReach`, `reachRows`, `ReachRow` (Task 8); `SECTION_REGISTRY` (Task 5); existing `BreakdownCard` in the analytics page.
- Produces: a "Section reach" panel per tracked page and a "Clicks" panel.

- [ ] **Step 1: Write the card component**

Create `components/admin/SectionReachCard.tsx`. A server component — no `"use client"`, it renders static bars.

```tsx
import type { ReachRow } from "@/lib/analytics/queries";

export function SectionReachCard({
  path,
  sessions,
  rows,
}: {
  path: string;
  sessions: number;
  rows: ReachRow[];
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">{path}</h2>
        <p className="shrink-0 text-xs text-charcoal/50">
          {sessions.toLocaleString()} {sessions === 1 ? "visit" : "visits"}
        </p>
      </div>

      {!sessions ? (
        <p className="mt-4 text-sm text-charcoal/50">No data yet.</p>
      ) : (
        <dl className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="truncate text-charcoal/70">{row.label}</dt>
                <dd className="shrink-0 font-medium text-ink">{row.pct}%</dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-grad-from to-grad-to"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the analytics page**

In `app/admin/analytics/page.tsx`, add these imports:

```tsx
import { getAnalyticsSummary, getSectionReach, reachRows } from "@/lib/analytics/queries";
import { SECTION_REGISTRY } from "@/lib/analytics/sections";
import { SectionReachCard } from "@/components/admin/SectionReachCard";
```

Change the existing summary fetch (line 45) to fetch both in parallel:

```tsx
const [summary, reach] = await Promise.all([
  getAnalyticsSummary(days),
  getSectionReach(days),
]);
```

The existing `if (!summary)` early return stays exactly as it is — `reach` being null is handled separately below, so a failed reach query cannot blank the whole page.

Then insert this block immediately before the closing `</div>` of the page's root element, after the existing "Top pages / Top sources" grid:

```tsx
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
```

Note the map key: the `events.label` column holds the section **key** (`threeds`), which is what `reachRows` looks up — the human-readable name comes from the registry, not the database.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: clean build.

If it fails with a stale `.next/dev/types/routes.d.ts` type error, run `rm -rf .next` and rebuild — a known local artifact issue, not a source bug.

- [ ] **Step 4: Verify the panel renders**

Start `npm run dev`, log in at `/login`, and open `http://localhost:3000/admin/analytics`.

Expected: three "Section reach" cards (`/`, `/about`, `/services`). With no data yet each shows "No data yet." — that is correct, not a failure.

- [ ] **Step 5: End-to-end verification**

In a normal browser window, visit `http://localhost:3000/`, scroll slowly to the bottom, then click through to `/about`. Then check:

```sql
select path, label, count(*) from public.events
where type = 'section_view' group by 1, 2 order by 1, 2;
```

Expected: rows for `/` covering `hero`, `industries`, `threeds`, `threees`, `cta` — **each with count 1**, proving deduplication works. A count above 1 for a single visit means the dedup `Set` is not holding.

Reload `/admin/analytics` and confirm the bars now show real percentages.

- [ ] **Step 6: Commit**

```bash
git add components/admin/SectionReachCard.tsx app/admin/analytics/page.tsx
git commit -m "Add section reach and clicks panels to admin analytics"
```

---

## Post-implementation

- [ ] Run the full suite: `npm test` — expected 57 passing.
- [ ] Run `npm run build` — expected clean.
- [ ] Delete probe data before it pollutes real numbers:
  ```sql
  delete from public.events where is_staging = true;
  ```
- [ ] Add to `PRE-LAUNCH-CHECKLIST.md` §8 (data cleanup at cutover):
  `delete from events where is_staging = true;`
