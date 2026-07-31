# Cloudflare Turnstile Form Protection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Cloudflare Turnstile in front of the contact, discovery and job-application forms, so automated submissions cannot burn Resend sender reputation or fill Supabase Storage with junk uploads.

**Architecture:** One server-side verifier (`lib/turnstile.ts`) called last-before-side-effects in each of the three API routes, and one client widget (`components/forms/Turnstile.tsx`) dropped in beside the existing `<Honeypot>`. The widget writes a hidden `cf-turnstile-response` input — which the two `FormData`-based forms pick up for free — and also reports the token through an `onToken` callback for the one form that hand-builds its payload. With the env vars unset the whole feature is inert.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript, Vitest 4, Tailwind.

## Global Constraints

- **Ships inert.** With `TURNSTILE_SECRET_KEY` unset the verifier returns ok; with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset the widget renders nothing and does not gate submit. Existing behaviour must be byte-for-byte unchanged in that state.
- **Turnstile tokens are single-use.** Verification runs *after* field validation, and the widget resets after *any* failed submit.
- **Fail-open on unreachable, fail-closed on invalid.** A network error, timeout or non-200 from `siteverify` returns ok and logs. An explicit `success: false` is rejected.
- **`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is build-time inlined.** Setting it requires a rebuild, never just a restart.
- **No new dependencies.** Load the Turnstile script by hand; do not add a React wrapper package.
- **Error copy** matches the existing house style: sentence case, ends with a period, offers a next step. Use exactly `Verification failed. Please try again.`
- **Both privacy files stay byte-identical:** `privacy-policy.md` and `app/(site)/privacy-policy/page.tsx`.
- Run `npx vitest run` and `npx tsc --noEmit` before every commit. Baseline is **103 tests passing**.

---

### Task 1: Server-side verifier

**Files:**
- Create: `lib/turnstile.ts`
- Create: `lib/turnstile.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: `verifyTurnstile(token: unknown, ip: string): Promise<{ ok: boolean; reason: string }>` — used by all three routes in Tasks 3–5.

- [ ] **Step 1: Write the failing tests**

Create `lib/turnstile.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("is disabled when no secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await verifyTurnstile("any-token", "192.0.2.1");

    expect(result).toEqual({ ok: true, reason: "disabled" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-string token without calling Cloudflare", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await verifyTurnstile(undefined, "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(await verifyTurnstile("   ", "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(await verifyTurnstile(42, "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare reports as valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({ success: true })));

    expect(await verifyTurnstile("good", "192.0.2.1")).toEqual({
      ok: true,
      reason: "verified",
    });
  });

  it("rejects a token Cloudflare reports as invalid, keeping the error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      ),
    );

    expect(await verifyTurnstile("used", "192.0.2.1")).toEqual({
      ok: false,
      reason: "timeout-or-duplicate",
    });
  });

  it("sends the secret, token and client IP", async () => {
    const fetchSpy = vi.fn(async () => okResponse({ success: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await verifyTurnstile("tok", "192.0.2.1");

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("192.0.2.1");
  });

  it("omits remoteip when the IP is unknown", async () => {
    const fetchSpy = vi.fn(async () => okResponse({ success: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await verifyTurnstile("tok", "unknown");

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it("fails open when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    expect(await verifyTurnstile("tok", "192.0.2.1")).toEqual({
      ok: true,
      reason: "unreachable",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("fails open on a non-200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response),
    );

    expect(await verifyTurnstile("tok", "192.0.2.1")).toEqual({
      ok: true,
      reason: "unreachable",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/turnstile.test.ts`
Expected: FAIL — `Failed to resolve import "./turnstile"`.

- [ ] **Step 3: Write the implementation**

Create `lib/turnstile.ts`:

```ts
/**
 * Cloudflare Turnstile verification for the public forms.
 *
 * Deliberately fails OPEN when Cloudflare cannot be reached: an outage there
 * would otherwise take contact and job applications offline site-wide, and the
 * honeypot plus per-IP rate limiting still apply. A token Cloudflare actively
 * reports as invalid is still rejected.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cap the wait so a hanging request cannot hold a form submission open. */
const TIMEOUT_MS = 5_000;

export type TurnstileResult = { ok: boolean; reason: string };

export async function verifyTurnstile(
  token: unknown,
  ip: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: "disabled" };

  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, reason: "missing" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify returned HTTP", res.status);
      return { ok: true, reason: "unreachable" };
    }

    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (json.success) return { ok: true, reason: "verified" };
    return { ok: false, reason: json["error-codes"]?.[0] ?? "failed" };
  } catch (err) {
    console.error("[turnstile] siteverify unreachable:", err);
    return { ok: true, reason: "unreachable" };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/turnstile.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Document the env vars**

Append to `.env.example`:

```
# --- Cloudflare Turnstile (form anti-abuse) ---
# Create a Managed widget at Cloudflare > Turnstile. Hostnames must list every
# host the forms are served from - Turnstile matches EXACTLY and does not
# inherit subdomains: w2.pplsolutionsinc.com, www.pplsolutionsinc.com,
# pplsolutionsinc.com, localhost
# Leave BOTH unset to disable Turnstile entirely; the forms then behave as they
# did before it existed.
# NOTE: NEXT_PUBLIC_TURNSTILE_SITE_KEY is inlined at BUILD time - setting it
# requires a rebuild, not just a restart.
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 111 tests passing (103 + 8), tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/turnstile.ts lib/turnstile.test.ts .env.example
git commit -m "Add Turnstile verification, failing open when Cloudflare is unreachable"
```

---

### Task 2: Client widget component

**Files:**
- Create: `components/forms/Turnstile.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TURNSTILE_ENABLED: boolean` — true when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
  - `TurnstileWidget` — props `{ onToken: (token: string | null) => void; ref?: React.Ref<TurnstileHandle> }`.
  - `type TurnstileHandle = { reset: () => void }`.
  - **`useTurnstile()`** — returns `{ token, setToken, ref, reset, blocked }`. This is what Tasks 3–5 actually consume; they should not touch `TURNSTILE_ENABLED` or `TurnstileHandle` directly.

All used by Tasks 3, 4 and 5.

> **Why the hook exists.** Reset-after-failed-submit is the rule this feature breaks on if forgotten. Duplicating it across three forms is three chances to get it wrong, and three places to miss when changing it. The hook makes it exist once.

- [ ] **Step 1: Write the component**

Create `components/forms/Turnstile.tsx`:

```tsx
"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Whether Turnstile is configured. When false the widget renders nothing and
 * forms must NOT gate their submit button, so the site behaves exactly as it
 * did before Turnstile existed.
 */
export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Module-level so three forms on three pages share one script load. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null; // let a later mount retry
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(el);
  });

  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

export function TurnstileWidget({
  onToken,
  ref,
}: {
  onToken: (token: string | null) => void;
  ref?: React.Ref<TurnstileHandle>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        onToken(null);
      }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        // React 18+ StrictMode double-invokes effects in dev; without this the
        // widget renders twice into the same container.
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          // Tokens expire after ~5 minutes, which a long discovery form outlives.
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setFailed(true);
          },
          theme: "light",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // onToken is intentionally excluded: callers pass an inline function, and
    // re-running this effect would tear down and re-render the widget on every
    // parent render, losing the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p className="mt-2 text-sm text-charcoal/70">
          Verification could not load, so this form cannot be submitted. Please
          refresh the page, or disable your ad blocker and try again.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the consumer hook**

Append to the same file, `components/forms/Turnstile.tsx`:

```tsx
/**
 * Everything a form needs to use Turnstile.
 *
 * `reset()` exists here rather than in each form because resetting after a
 * failed submit is the one rule this feature breaks on if forgotten: tokens are
 * single-use, so without it a visitor who mistypes their email is trapped in a
 * loop where every retry fails.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const ref = useRef<TurnstileHandle>(null);

  const reset = useCallback(() => {
    ref.current?.reset();
    setToken(null);
  }, []);

  return {
    token,
    setToken,
    ref,
    reset,
    /** True when a token is required but not yet available — gate submit on this. */
    blocked: TURNSTILE_ENABLED && !token,
  };
}
```

Add `useCallback` to the React import at the top of the file.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Verify it is genuinely inert without a site key**

Run: `npx vitest run && npm run build`
Expected: 111 tests pass; build succeeds. With no `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the environment, `TURNSTILE_ENABLED` compiles to `false` and the component returns `null`.

- [ ] **Step 5: Commit**

```bash
git add components/forms/Turnstile.tsx
git commit -m "Add the Turnstile widget, inert until a site key is configured"
```

---

### Task 3: Contact form and route

**Files:**
- Modify: `components/forms/ContactForm.tsx`
- Modify: `app/api/contact/route.ts`

**Interfaces:**
- Consumes: `verifyTurnstile` (Task 1); `TurnstileWidget`, `useTurnstile` (Task 2); existing `clientIp` from `lib/rateLimit.ts`.
- Produces: the wiring pattern Tasks 4 and 5 repeat.

- [ ] **Step 1: Wire the form**

In `components/forms/ContactForm.tsx`:

Add to the imports after line 8:

```tsx
import { TurnstileWidget, useTurnstile } from "./Turnstile";
```

Add the hook below line 14:

```tsx
  const {
    setToken,
    ref: turnstileRef,
    reset: resetTurnstile,
    blocked,
  } = useTurnstile();
```

The token rides along automatically — `Object.fromEntries(new FormData(form))` on line 23 already picks up the hidden `cf-turnstile-response` input Turnstile injects. No change to the request body is needed.

Reset the widget whenever a submit fails, so a corrected resubmission carries a fresh token. Replace the `catch` block (lines 39–42) with:

```tsx
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // The token was consumed (or rejected) server-side; a retry needs a new one.
      resetTurnstile();
    }
```

Insert the widget immediately before the submit button (before line 91):

```tsx
      <TurnstileWidget ref={turnstileRef} onToken={setToken} />
```

Replace the whole submit button. **Both** the `disabled` prop and the label must change — a disabled button with no explanation reads as a broken form, so the label has to say why:

```tsx
      <Button
        type="submit"
        disabled={status === "submitting" || blocked}
        className="w-full sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending…
          </>
        ) : blocked ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Verifying…
          </>
        ) : (
          "Send Message"
        )}
      </Button>
```

- [ ] **Step 2: Wire the route**

In `app/api/contact/route.ts`, add to the imports:

```ts
import { verifyTurnstile } from "@/lib/turnstile";
```

Insert **after** all field validation and **immediately before** `const payload = {` (currently line 73):

```ts
  // Last gate before any side effect. Runs after validation so a correctable
  // mistake (bad email, empty message) never consumes the single-use token.
  const turnstile = await verifyTurnstile(body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    console.warn("[contact] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 400 },
    );
  }
```

`ip` is already in scope — it is computed at the top of the handler for the rate limiter.

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0; 111 tests passing.

- [ ] **Step 4: Verify no regression while disabled**

With no Turnstile env vars set, start the dev server and submit the contact form.

Run: `npm run dev`, then in another shell:

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"firstName":"A","lastName":"B","email":"a@example.com","message":"hi","company_url":""}' \
  http://localhost:3000/api/contact
```

Expected: `{"ok":true}` — identical to today, because `verifyTurnstile` short-circuits on the unset secret.

- [ ] **Step 5: Commit**

```bash
git add components/forms/ContactForm.tsx app/api/contact/route.ts
git commit -m "Verify Turnstile on the contact form"
```

---

### Task 4: Discovery form and route

**Files:**
- Modify: `components/forms/DiscoveryForm.tsx`
- Modify: `app/api/discovery/route.ts`

**Interfaces:**
- Consumes: `verifyTurnstile` (Task 1); `TurnstileWidget`, `useTurnstile` (Task 2).
- Produces: nothing new.

**This is the one form that does NOT pick the token up automatically** — it hand-builds `payload`, so the token must be added explicitly.

- [ ] **Step 1: Wire the form**

In `components/forms/DiscoveryForm.tsx`:

Add the import:

```tsx
import { TurnstileWidget, useTurnstile } from "./Turnstile";
```

Add the hook beside the existing `status` / `error` state. **Unlike the other two forms, this one destructures `token` as well**, because it needs the raw value for its hand-built payload:

```tsx
  const {
    token,
    setToken,
    ref: turnstileRef,
    reset: resetTurnstile,
    blocked,
  } = useTurnstile();
```

Add the token to `payload` — it is built by hand here, so unlike the contact form it will NOT arrive on its own:

```tsx
    const payload = {
      ...data,
      industry:
        data.industry === "Other" && data.industryOther
          ? data.industryOther
          : data.industry,
      sessionId: getSessionId(),
      "cf-turnstile-response": token,
    };
```

Reset on failure, in the existing `catch`:

```tsx
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      resetTurnstile();
    }
```

**This form is multi-step, and that changes the wiring.** Its button reads "Next" on steps 0–1 and only submits on the final step (`step < 2 ? "Next" : "Request Consultation"`), and it is already gated by `!canAdvance`. Turnstile must gate **only the final submit** — adding `blocked` to the shared expression would disable the Next button and trap the visitor on step 1.

Render the widget only on the final step, immediately above the button row:

```tsx
      {step === 2 && <TurnstileWidget ref={turnstileRef} onToken={setToken} />}
```

Then replace the whole submit button, gating on `blocked` only when `step === 2`:

```tsx
        <Button
          type="submit"
          disabled={!canAdvance || status === "submitting" || (step === 2 && blocked)}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Sending…
            </>
          ) : step < 2 ? (
            <>
              Next <ArrowRight className="size-4" />
            </>
          ) : blocked ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Verifying…
            </>
          ) : (
            "Request Consultation"
          )}
        </Button>
```

- [ ] **Step 2: Wire the route**

In `app/api/discovery/route.ts`, add the import:

```ts
import { verifyTurnstile } from "@/lib/turnstile";
```

Insert after the last validation check (the `isWithinLength(b.goals, …)` block ending near line 53) and before the inquiry is persisted:

```ts
  const turnstile = await verifyTurnstile(body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    console.warn("[discovery] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 400 },
    );
  }
```

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0; 111 tests passing.

- [ ] **Step 4: Verify no regression while disabled**

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"fullName":"A B","email":"a@example.com","company_url":""}' \
  http://localhost:3000/api/discovery
```

Expected: `{"ok":true}`.

- [ ] **Step 5: Commit**

```bash
git add components/forms/DiscoveryForm.tsx app/api/discovery/route.ts
git commit -m "Verify Turnstile on the discovery form"
```

---

### Task 5: Job application form and route

**Files:**
- Modify: `components/careers/ApplicationForm.tsx`
- Modify: `app/api/apply/route.ts`

**Interfaces:**
- Consumes: `verifyTurnstile` (Task 1); `TurnstileWidget`, `useTurnstile` (Task 2).
- Produces: nothing new.

This route is `multipart/form-data`, so the token is read with `form.get(...)` rather than from a JSON body.

- [ ] **Step 1: Wire the form**

In `components/careers/ApplicationForm.tsx`, add the import:

```tsx
import { TurnstileWidget, useTurnstile } from "@/components/forms/Turnstile";
```

Add the hook beside the existing `status` / `error` / `fileName` state:

```tsx
  const {
    setToken,
    ref: turnstileRef,
    reset: resetTurnstile,
    blocked,
  } = useTurnstile();
```

No change to the request body: `new FormData(form)` already includes the hidden `cf-turnstile-response` input.

Reset on failure, in the existing `catch`:

```tsx
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      resetTurnstile();
    }
```

Also reset on the two **early returns** that bail before `fetch` (missing CV, oversized CV). Those never reach the server, so the token is untouched and must NOT be reset — leave those two `return` statements exactly as they are. Only the `catch` resets.

Add the widget immediately before the submit button:

```tsx
      <TurnstileWidget ref={turnstileRef} onToken={setToken} />
```

Then replace the whole submit button. **Both** the `disabled` prop and the label must change — a disabled button with no explanation reads as a broken form:

```tsx
      <Button
        type="submit"
        disabled={status === "submitting" || blocked}
        className="w-full sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : blocked ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Verifying…
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
```

- [ ] **Step 2: Wire the route**

In `app/api/apply/route.ts`, add the import:

```ts
import { verifyTurnstile } from "@/lib/turnstile";
```

Insert after the final field/file validation and **before** the Supabase Storage upload (currently around line 87, the `.upload(path, buffer, …)` call):

```ts
  // Before the upload specifically: an unverified submission must never put a
  // file in storage.
  const turnstile = await verifyTurnstile(form.get("cf-turnstile-response"), ip);
  if (!turnstile.ok) {
    console.warn("[apply] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 400 },
    );
  }
```

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0; 111 tests passing.

- [ ] **Step 4: Verify no regression while disabled**

Open a job page in the browser at `http://localhost:3000/careers`, pick a role, attach a small PDF and submit.
Expected: success state renders; a row appears in `applications`; the CV lands in the `cvs` bucket. Delete the test row and file afterwards.

- [ ] **Step 5: Commit**

```bash
git add components/careers/ApplicationForm.tsx app/api/apply/route.ts
git commit -m "Verify Turnstile on the job application form"
```

---

### Task 6: Privacy policy

**Files:**
- Modify: `app/(site)/privacy-policy/page.tsx`
- Modify: `privacy-policy.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

Both files carry the same content and must stay byte-identical.

**Do NOT touch the analytics paragraph** — *"The Company uses its own first-party, cookieless analytics… No data is disclosed to any other entity, and no cookies are used for this purpose."* That sentence is scoped to analytics, remains true, and is the basis for the site having no cookie-consent banner. Widening it would create a problem that does not currently exist.

- [ ] **Step 1: Name Turnstile in the security section**

In the security list that currently contains `"Third-party services contracted to support data security and infrastructure."`, add a following item:

```
"We use Cloudflare Turnstile to protect our online forms from automated abuse. When you submit a form, Cloudflare receives technical information about your browser and connection solely to distinguish human visitors from automated traffic. Turnstile does not use cookies and is not used to track you across websites.",
```

- [ ] **Step 2: Qualify the disclosure sentence**

Change the Disclosure of Personal Data paragraph from:

```
"Personal data processed by the Company is not shared with any other party unless such disclosure is legally allowed under Section 12 or 13 of the DPA which in some instances require court orders.",
```

to:

```
"Personal data processed by the Company is not shared with any other party, except for the service providers described in this Policy who process data on our behalf to operate and secure this website, or unless such disclosure is legally allowed under Section 12 or 13 of the DPA which in some instances require court orders.",
```

- [ ] **Step 3: Apply the same two edits to `privacy-policy.md`**

Make the identical wording changes so the two files do not drift.

- [ ] **Step 4: Verify the two files agree**

```bash
grep -c "Cloudflare Turnstile" privacy-policy.md "app/(site)/privacy-policy/page.tsx"
grep -c "process data on our behalf" privacy-policy.md "app/(site)/privacy-policy/page.tsx"
```

Expected: `1` from each file, for both greps.

- [ ] **Step 5: Confirm it renders**

Run: `npm run dev`, open `http://localhost:3000/privacy-policy`, confirm both passages appear and the page layout is unbroken.

- [ ] **Step 6: Commit**

```bash
git add "app/(site)/privacy-policy/page.tsx" privacy-policy.md
git commit -m "Disclose Cloudflare Turnstile in the privacy policy"
```

---

### Task 7: Deploy, then enable

**Files:**
- Modify: `/var/www/ppl/.env.production` (on the VPS — not in the repo)
- Modify: `DEPLOY-VPS.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a live, verified deployment.

- [ ] **Step 1: Deploy while still inert, and prove nothing regressed**

```bash
git push origin master
ssh gilbertd@187.127.121.54 '/var/www/ppl/deploy.sh'
```

Then, allowing for the brief 502 while PM2 reloads:

```bash
for p in / /contact /careers /resources/how-to-get-started; do
  printf "%-32s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -u ppl:Jaax4PvOUvE9 "https://w2.pplsolutionsinc.com$p")"
done
```

Expected: all 200. The forms must look and behave exactly as before, because no keys are set yet.

- [ ] **Step 2: Add the keys**

Ask the user for the site key and secret key from their Cloudflare Turnstile widget. Append to `/var/www/ppl/.env.production` (0600, gitignored):

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>
```

- [ ] **Step 3: Rebuild — a restart is not enough**

```bash
ssh gilbertd@187.127.121.54 'cd /var/www/ppl && npm run build && pm2 reload ppl --update-env'
```

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is inlined at build time; `pm2 reload` alone would leave the widget disabled in the shipped JavaScript.

- [ ] **Step 4: Verify the widget renders**

```bash
curl -s -u ppl:Jaax4PvOUvE9 https://w2.pplsolutionsinc.com/contact | grep -c "turnstile"
```

Expected: at least 1.

- [ ] **Step 5: Verify an unverified submission is now rejected**

```bash
curl -s -u ppl:Jaax4PvOUvE9 -X POST -H 'content-type: application/json' \
  -d '{"firstName":"A","lastName":"B","email":"a@example.com","message":"hi","company_url":""}' \
  https://w2.pplsolutionsinc.com/api/contact
```

Expected: `{"ok":false,"error":"Verification failed. Please try again."}` with HTTP 400. **This is the key proof** — before the keys, the same request returned `{"ok":true}`.

- [ ] **Step 6: Verify a real browser submission still succeeds**

In a browser, open `https://w2.pplsolutionsinc.com/contact`, complete and submit the form. Confirm the success panel renders and a row appears in `inquiries`. Then delete that test row.

This step cannot be skipped or replaced by curl: it is the only check that the widget actually solves and that the submit-gating does not lock real users out.

- [ ] **Step 7: Record it in the runbook**

Add to the environment section of `DEPLOY-VPS.md`, noting that `NEXT_PUBLIC_TURNSTILE_SITE_KEY` joins the build-time-inlined variables and that adding or changing it requires a rebuild.

- [ ] **Step 8: Commit**

```bash
git add DEPLOY-VPS.md
git commit -m "Record the Turnstile env vars in the deployment runbook"
git push origin master
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| `lib/turnstile.ts` with the five documented outcomes | 1 |
| Short timeout, `remoteip` from `clientIp` | 1 |
| Test matrix (unset, missing, success, failure, throw, non-200) | 1 |
| Env vars documented, hostname caveat | 1 |
| Explicit rendering, singleton script load | 2 |
| Hidden input *and* `onToken` callback | 2 |
| `expired-callback` and `error-callback` | 2 |
| `reset()` handle | 2 |
| Submit gated until token, "Verifying…" state | 3, 4, 5 — *see note below* |
| Verification after validation | 3, 4, 5 |
| Widget resets after failed submit | 3, 4, 5 |
| Order: rate limit → honeypot → validation → Turnstile → side effects | 3, 4, 5 |
| Privacy policy, both files, analytics paragraph untouched | 6 |
| Ships inert; rebuild required to enable | 1, 2, 7 |
| Out of scope: login, honeypot removal, shared-store limiter | not planned — correct |

**Gap found and closed:** the spec calls for a `"Verifying…"` submit-button state, but Tasks 3–5 as first drafted only disabled the button. Disabling with no explanation looks like a broken form.

> **This was originally written here, as a note appended after the tasks — and that was the defect.**
> Tasks are extracted and handed to implementers one at a time, so anything living outside a task
> body never reaches the person doing the work. Task 3 shipped without the `"Verifying…"` state for
> exactly this reason, and its review caught it. The complete button code now lives **inside** Task 3,
> 4 and 5 Step 1, where it will actually be read.
>
> **Rule for this plan and any future one: a requirement that is not inside a task body does not exist.**

**Second gap, found while fixing the first:** Task 4's button is not like the others. The discovery
form is **multi-step** — the same button reads "Next" on steps 0–1 and only submits on step 2, and it
is already gated by `!canAdvance`. Adding `blocked` to that shared expression would have disabled
*Next* and trapped visitors on step 1. Task 4 now renders the widget only on the final step and gates
on `step === 2 && blocked`. This would not have been caught by the Task 3 pattern, because the two
forms are not actually the same shape.

**Placeholder scan:** none — every step carries literal code or a literal command.

**Type consistency:** `TurnstileHandle`, `TurnstileWidget`, `TURNSTILE_ENABLED` and `verifyTurnstile` are named identically in their defining task and every consuming task. The field name `cf-turnstile-response` is identical across the widget, all three forms and all three routes. `TurnstileResult` is `{ ok, reason }` everywhere.

**One risk worth stating:** Task 7 Step 6 (a real browser submission) is the only step that exercises the widget actually solving. Every other check would still pass if the widget rendered but never produced a token — in which case the submit button would stay disabled forever and the forms would be silently unusable. Do not skip it.
