# Cloudflare Turnstile on the public forms — design

**Date:** 2026-07-31
**Status:** approved, ready for implementation planning

## Problem

The three public forms — contact, discovery, job application — are protected only by a honeypot and
per-IP rate limiting. The honeypot stops naive bots and nothing else.

Abuse here is not merely noise:

- `/api/contact` and `/api/discovery` **send mail through Resend**. Spam burns quota and, more
  importantly, sender reputation on a domain that is about to be verified for the first time.
- `/api/apply` **accepts file uploads into Supabase Storage** — unvetted files and real cost.

The rate limiter was also, until `833d383`/`a50f6bc`, bypassable with a forged IP header. It works
now, but a rate limiter alone cannot distinguish a determined script from a person.

## Why Turnstile specifically

reCAPTCHA would reintroduce Google cookies and third-party data sharing. The site's analytics were
deliberately built first-party and cookieless so that **no cookie-consent banner is required**;
adopting reCAPTCHA would undo that decision and force both a banner and a privacy-policy rewrite.

Turnstile is cookieless, free, and unlimited. Critically, **its keys can be created in any Cloudflare
account against a hostname allowlist** — so this work is *not* blocked on gaining access to the
client's DNS zone, which is currently blocking everything else.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Widget mode | **Managed** | Cloudflare decides per visitor. Legitimate users see a self-completing checkbox; suspicious traffic gets a real challenge. Invisible mode never challenges anyone, which is barely stronger than the honeypot already in place. |
| Placement | Above the submit button, always visible | Standard and unsurprising. |
| Submit gating | Disabled until a token arrives, with a "Verifying…" state | Prevents submitting before the token exists, which would otherwise surface as a confusing server error. |
| Verifier unreachable | **Accept and log** | A Cloudflare outage would otherwise take lead capture and recruitment offline site-wide. Honeypot and rate limiting still apply, so it degrades to today's protection rather than to none. An explicitly *invalid* token is still rejected — this covers only "could not reach the verifier". |
| Keys unset | Skip verification entirely | Local dev keeps working, and the feature can ship inert before keys exist. Mirrors `lib/email.ts`, which already no-ops when unconfigured. |

## Components

### `lib/turnstile.ts`

```ts
verifyTurnstile(token: unknown, ip: string): Promise<{ ok: boolean; reason: string }>
```

| Situation | Returns |
|---|---|
| `TURNSTILE_SECRET_KEY` unset | `{ ok: true, reason: "disabled" }` |
| Token missing/not a string | `{ ok: false, reason: "missing" }` |
| `siteverify` returns success | `{ ok: true, reason: "verified" }` |
| `siteverify` returns failure | `{ ok: false, reason: <first error code> }` |
| fetch throws, times out, or non-200 | `{ ok: true, reason: "unreachable" }` + `console.error` |

Uses a short timeout (`AbortSignal.timeout`) so a hanging Cloudflare request cannot hold a form
submission open. Posts the client IP as `remoteip`, reusing `clientIp()` from `lib/rateLimit.ts`.

### `components/forms/Turnstile.tsx`

A client component placed beside `<Honeypot>` inside each `<form>`.

**Explicit rendering** (`window.turnstile.render()`), not the simpler automatic mode: the token must
live in React state to gate the submit button, and automatic rendering is unreliable under React
hydration. The script loads once via a module-level singleton promise, shared across all three forms.

It renders both:
- a hidden `cf-turnstile-response` input — so **Contact** and **Apply**, which build their bodies
  from `FormData`, pick the token up with no change to their submit logic
- an `onToken(token | null)` callback — so **Discovery**, which assembles its payload by hand, can
  add the token explicitly

Handles `expired-callback` (tokens expire after ~5 minutes, which a long discovery form will
outlive) and `error-callback`, both clearing the token and re-disabling submit.

Exposes a `reset()` handle to its parent.

## The single-use token trap

**Turnstile tokens are consumed by `siteverify` and cannot be reused.** Two consequences, both of
which must be implemented or the forms break in ordinary use:

1. **Verification runs after field validation** in each route. A "please enter a valid email" error
   must not consume the token.
2. **The widget resets after any failed submit.** Otherwise a visitor who mistypes their email
   enters a loop where every retry fails with a duplicate-token error — the most likely way a naive
   implementation breaks in production, and one that would only appear under real use.

## Route integration

Order in all three routes: **rate limit → honeypot → field validation → Turnstile → side effects.**

Turnstile sits last before any side effect, so no mail is sent and no file is stored for an
unverified submission, while cheap rejections never waste a token or an API call.

Failure returns `400` with a plain message ("Verification failed. Please try again."), consistent
with the existing error shape.

## Testing

`lib/turnstile.test.ts`, with a mocked `fetch` — no network in tests, consistent with the existing
103:

- secret unset → `ok`, `disabled`
- missing/non-string token → not ok
- success response → ok
- failure response → not ok, carries the error code
- fetch throws → ok, `unreachable`, logged
- non-200 response → ok, `unreachable`
- timeout → ok, `unreachable`

## Environment

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # public; BUILD-TIME INLINED - adding it later needs a rebuild
TURNSTILE_SECRET_KEY=             # server only
```

Both documented in `.env.example`. Widget hostnames must list `w2.pplsolutionsinc.com`,
`www.pplsolutionsinc.com`, `pplsolutionsinc.com` and `localhost` — **Turnstile matches hostnames
exactly and does not inherit subdomains.**

## Privacy policy

Turnstile is a third party receiving visitor data. The current policy is closer to correct than
first assumed — the three relevant passages differ, and only one is actually a problem:

| Passage | Effect |
|---|---|
| Analytics: *"No data is disclosed to any other entity, and no cookies are used for this purpose."* | **Stays true.** Scoped to analytics, which remains first-party and cookieless. Turnstile is not analytics. Do not widen this sentence — it is the basis for having no cookie banner. |
| Security: lists *"Third-party services contracted to support data security and infrastructure."* | **Already covers Turnstile** conceptually. Naming it here is a clarification, not a correction. |
| Disclosure of Personal Data: *"Personal data processed by the Company is not shared with any other party unless such disclosure is legally allowed under Section 12 or 13 of the DPA…"* | **The one genuine tension.** As written this is a blanket claim that a security processor would contradict. |

Change: name Cloudflare Turnstile in the security section as a processor used solely to protect the
forms from automated abuse, and qualify the disclosure sentence so it accommodates that processor
rather than reading as an absolute.

**No cookie-consent banner is required.** Turnstile is cookieless and the site's analytics remain
first-party, so the existing no-banner position stands unchanged.

Both `privacy-policy.md` and `app/(site)/privacy-policy/page.tsx` carry this content and must be
kept byte-identical, as they were for the office address.

## Rollout

Ships inert: with the keys unset, every form behaves exactly as today. That allows deploying and
confirming no regression *before* the keys exist, then enabling the feature with a rebuild.

## Out of scope

- Turnstile on the staff login. `/login` is Supabase Auth behind its own rate limiting and is not
  publicly advertised; adding a challenge there is unnecessary friction for three staff accounts.
- Replacing the honeypot. It is free, catches the laziest bots before any API call, and is already
  wired into all three forms.
- Replacing the in-memory rate limiter with a shared store. Separate concern, single instance today.
