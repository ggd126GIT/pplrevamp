# Website Integrations — Current Inventory

**Prepared:** 2026-08-07 · **Site:** https://www.pplsolutionsinc.com

Answers the question: what third-party services, analytics, tracking, forms and
external connections are currently in place?

**Everything above the INTERNAL line is written to be sent as-is.**

---

## The short answer

The site was rebuilt from scratch earlier this year (custom Next.js, replacing
the old WordPress install), so the integration list is short and deliberate —
nothing was inherited from the old site.

## What runs in a visitor's browser

Only two third-party hosts load on any page, both Cloudflare:

| Service | Purpose | Cookies? |
|---|---|---|
| Cloudflare Turnstile | Bot/spam protection on the three forms | No |
| Cloudflare Web Analytics | Page-performance and traffic beacon | No |

That is the complete list. There is **no** Google Analytics, Google Tag Manager,
Meta/Facebook Pixel, LinkedIn Insight Tag, Hotjar, Clarity, chat widget,
scheduling embed, marketing-automation script, or advertising pixel of any kind.
No third-party iframes. Site fonts are self-hosted at build time, so there is no
runtime call to Google Fonts either.

## Analytics

Traffic analytics are **first-party and built into the site** — page views,
section-reach and click events post to our own API and are stored in our own
database, surfaced in the site's admin panel. It uses a `sessionStorage`
identifier rather than cookies, and visitor IP addresses are not stored (an
approximate country/region/city is derived at the network edge and only that is
kept). This is why the site carries no cookie-consent banner.

## Infrastructure services

Supporting services, not visitor-tracking tools:

- **Hostinger VPS** — hosting (Node / PM2 / Nginx)
- **Cloudflare** — DNS, CDN, TLS, WAF / rate limiting
- **Supabase** — database, staff logins, and file storage for blog images and CVs
- **Resend** — transactional email sent from the site
- **Microsoft 365** — the company mailboxes that receive form notifications

## Forms and external connections

Three live forms, all Turnstile-protected and rate-limited:

1. **Contact** → stored in our database + notification to `sales@`
2. **Consultation / discovery request** → same path
3. **Job application** → CV uploaded to private storage + notification to
   `careers@` with the CV attached

All three write to our own database and send mail via Resend. The only outbound
call the server makes to a third party is Cloudflare's Turnstile verification
endpoint. There are no other external system connections — no CRM sync, no
webhook, no data feed to any marketing platform.

## Anything installed but no longer used

No dormant tracking scripts — the rebuild means nothing carried over from
WordPress. Two things worth knowing:

- A **HubSpot CRM account exists and has been configured** (deal pipeline,
  lead-capture form), but the **website is not yet connected to it**. Form
  submissions currently go to email and our database only; nothing reaches
  HubSpot. Wiring that up is available work whenever you want it.
- A **referral programme page** exists but is intentionally unlinked from the
  navigation pending legal review, and has no active form.

---
---

# ⛔ INTERNAL — DO NOT SEND BELOW THIS LINE ⛔

## Two open issues found while compiling this

### 1. Cloudflare Web Analytics contradicts our own privacy policy

`static.cloudflareinsights.com/beacon.min.js` loads on the live site. It appears
**nowhere in the codebase** — Cloudflare injects it at the edge, so it was
enabled in the Cloudflare dashboard, not by us.

`app/(site)/privacy-policy/page.tsx:67` states the company uses *"its own
first-party, cookieless analytics"* and that *"No data is disclosed to any other
entity."* With that beacon running, the second clause is not accurate.

Two options:
- **Turn the beacon off** in Cloudflare (Web Analytics). We do not use its data —
  the first-party analytics already cover it. Cleanest, no copy change.
- **Amend the privacy policy** to name Cloudflare Web Analytics, alongside the
  existing Turnstile paragraph at line 108, which is a good model for the wording.

Recommend the first.

### 2. The Vercel staging copy is still live

`pplrevamp.vercel.app` still auto-deploys from the same repo and points at the
same Supabase project. Password-gated and `noindex`, so not a disclosure risk,
but it is a second running copy of the site that is not in the inventory above.
Worth retiring now that production is stable.

## How this was verified

- Repo-wide grep for script tags, iframes, `dangerouslySetInnerHTML`, and known
  vendor names (GA/GTM, Meta, LinkedIn, Hotjar, Clarity, Calendly, Intercom,
  Drift, Crisp, Tawk, HubSpot). Only hits are our own JSON-LD schema blocks and
  the `no-js` class-removal inline script in `app/layout.tsx`.
- `package.json` dependency list — no analytics or marketing SDKs.
- All `process.env.*` references in `app/`, `components/`, `lib/`, `proxy.ts`
  cross-checked against `.env.example`. No HubSpot or ad-platform keys exist.
- Every outbound `fetch()` in server code: exactly one, `lib/turnstile.ts` →
  Cloudflare siteverify.
- Live browser load of `/contact`, reading `performance.getEntriesByType('resource')`
  for all non-first-party hosts. Result: `challenges.cloudflare.com` and
  `static.cloudflareinsights.com` only.

**One check not completed:** the plan was to prove the beacon is edge-injected by
diffing the origin's raw HTML against the Cloudflare-served HTML. `w2.pplsolutionsinc.com`
returned 401 — the staging basic-auth password on file appears stale. The
zero-matches repo grep is the basis for the edge-injection claim instead. Re-run
the origin diff if that claim ever needs to be airtight.
