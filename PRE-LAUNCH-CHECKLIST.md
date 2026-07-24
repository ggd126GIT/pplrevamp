# Pre-Launch / Production Cutover Checklist

**Project:** .ppl Solutions, Inc. website revamp (Next.js 16 + Supabase + Resend)
**Purpose:** Everything that must be reviewed / changed before pointing the real domain
(`pplsolutionsinc.com`) at the new site. Compiled 2026-07-23.

Legend: 🔴 blocker (site is wrong/broken in prod without it) · 🟠 should-fix (correctness/quality) · 🟡 content/polish · ✅ verify after deploy

---

## 1. Environment variables (🔴 blockers)

These are currently set for **Vercel staging** and will produce a broken or leaky
production site if not changed at cutover.

| Var | Staging value now | Production action |
|---|---|---|
| `STAGING_PASSWORD` | set (`ppl` / `Jaax4PvOUvE9`) | **UNSET IT.** While set it (a) basic-auth-gates the whole site, (b) forces `robots.txt` → `Disallow: /`, (c) adds `x-robots-tag: noindex`, (d) stamps every inquiry `_staging:true` and every page_view `is_staging:true`. Leaving it set = production stays private and de-indexed. |
| `NEXT_PUBLIC_SITE_URL` | `https://pplrevamp.vercel.app` | Set to `https://www.pplsolutionsinc.com`. Consumed by `app/layout.tsx` (canonical/OG), `app/sitemap.ts`, `app/robots.ts`, `lib/site.ts`, `app/api/track/route.ts`. Wrong value = canonical tags + sitemap point at Vercel. **No trailing slash** (consumers string-concat `/sitemap.xml`). |
| `RESEND_FROM` | unset → defaults to `onboarding@resend.dev` (`lib/email.ts:3`) | Set to a verified `@pplsolutionsinc.com` (or `@send.pplsolutionsinc.com`) sender. Until the domain is verified in Resend, auto-replies to visitors are rejected (test mode only delivers to the signup inbox). |
| `CONTACT_NOTIFY_EMAIL` | `gilbert.dayalo@pplsolutionsinc.com` (monitored test inbox) | Switch to the real destination inbox (e.g. `sales@pplsolutionsinc.com`). **If unset, internal notifications silently no-op** (`lib/email.ts`). |
| `JOBS_NOTIFY_EMAIL` | unset | Optional. Set to e.g. `jobs@pplsolutionsinc.com` to route job-application notifications away from the contact inbox. Falls back to `CONTACT_NOTIFY_EMAIL` when unset. |
| `SUPABASE_SERVICE_ROLE_KEY` | set (`sb_secret_…`) | Confirm present in prod env — its absence breaks CV upload ("Applications temporarily unavailable") and page-view tracking (`/api/track` no-ops without it). |
| `RESEND_API_KEY` | set | Confirm present. Absence makes all email a silent no-op. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_ANON_KEY` | set | Confirm present (build-time inlined — a change needs a **redeploy**, not just a save). |

> **Vercel note:** `NEXT_PUBLIC_*` vars are inlined at build time. Any change requires a redeploy, not just saving the value.

---

## 2. Email deliverability (🔴 blocker)

- **Resend domain not verified** — blocked by DNS access (see §3). Until done, visitor
  auto-replies bounce; only the signup inbox receives mail.
- Plan: verify the **`send.pplsolutionsinc.com` subdomain** in Resend (isolates from the
  company's Microsoft 365 root mail), add records in Cloudflare as **DNS-only (grey cloud)**.
  Cloudflare's Name field is relative — enter `send`, not the FQDN. The subdomain does not
  exist yet = clean slate. **Do not touch root MX/SPF** (M365).

---

## 3. DNS reality for `pplsolutionsinc.com` (🔴 blocker — access problem)

- **Hostinger is registrar only** — its DNS panel says "DNS managed elsewhere".
  **Never accept its "switch nameservers to Hostinger" offer** — it would move the zone and can drop records.
- **Authoritative NS = Cloudflare** (`yisroel` / `kristin.ns.cloudflare.com`), in a Cloudflare
  account **the user does not currently control.** Adding the domain to your own Cloudflare only
  opens the lossy onboarding scan — do not complete it / do not change nameservers.
- Company mail = **Microsoft 365**; root SPF `v=spf1 include:spf.protection.outlook.com -all`.
- **Action needed:** obtain access to the controlling Cloudflare account (or have its owner add
  the records) before either Resend verification or DNS cutover can happen. This is the single
  biggest external dependency.

---

## 4. Deployment target decision (🔴 blocker)

- **CLAUDE.md spec target = VPS** (Node 20, PM2, Nginx reverse proxy, Certbot SSL). **Not started.**
- Current live environment is **Vercel (staging only)** — Hobby plan is licensed non-commercial,
  fine for short-lived review, **not** for a long-term commercial production site.
- **Decide:** VPS (per spec) vs. a paid Vercel plan. If VPS, the whole PM2/Nginx/Certbot/DNS
  step still has to be built and tested.

### VPS-specific gotcha — country tracking (✅ resolved)
- `x-vercel-ip-country` only exists on Vercel and would go `null` on the VPS. Now handled by
  `countryFromHeaders()` (`lib/analytics/parse.ts`, unit-tested), which tries
  `x-vercel-ip-country` → `cf-ipcountry` → `x-geoip-country` and rejects `XX`/`T1`/malformed values.
- **Still needed on the VPS:** the country only populates if something upstream sets one of those
  headers — either Cloudflare proxying (orange cloud) or the Nginx GeoIP module writing
  `x-geoip-country`. Without either, `country` stays null (harmless; nothing displays it yet).
- **City/region precision is Vercel-only for free.** `geoFromHeaders()` also reads
  `x-vercel-ip-city` / `x-vercel-ip-country-region` (Vercel) and `cf-ipcity` / `x-geoip-*`
  (Cloudflare Enterprise / Nginx GeoIP). Cloudflare's **free** tier gives country only — a VPS
  needs an Nginx MaxMind GeoIP module to populate `city`. Without it, `city`/`region` stay null
  (shown as "Unknown"; harmless). No new cutover cleanup line is needed — `city`/`region` live on
  `page_views`, already covered by `delete from page_views where is_staging = true`.

---

## 5. Security / auth (🔴)

- **Rotate the admin password.** Dev/staging login `admin@ppl.com` / `admin12345` is weak and
  known. Rotate before any wider sharing and before go-live. (Second seed
  `admin@pplsolutionsinc.com` also exists.)
- Confirm Supabase RLS is intact in prod: `page_views` staff-read-only / no anon insert;
  published-posts + open-jobs public select; inquiries/applications staff-only.
- `analytics_summary()` SQL function is **SECURITY INVOKER** by design — do **not** switch it to
  DEFINER; RLS is what keeps analytics staff-only.

---

## 6. Email-send correctness bugs (✅ resolved)

All three public form routes previously used `Promise.all` for the two concurrent sends, so a
rejected visitor auto-reply (Resend test mode rejects any non-signup recipient) aborted the batch
and could leave the internal notification's request in flight when a serverless function froze —
**silently losing the notification.**

**Fixed:** `settleSends()` in `lib/email.ts` wraps `Promise.allSettled`, logs each failure by name
(`[contact] auto-reply failed: …`), and never throws. Wired into `/api/contact`, `/api/discovery`,
and `/api/apply`.

### Per-form notification routing (✅ resolved)
- `sendInternalNotification` now takes an options object `{ attachments?, to? }`. `/api/apply`
  passes `to: process.env.JOBS_NOTIFY_EMAIL`, which falls back to `CONTACT_NOTIFY_EMAIL` when
  unset. Reminder: if **both** are unset the send is still a silent no-op.

---

## 7. Admin UI cleanups (✅ resolved)

- **`_staging` junk field on inquiry cards** — fixed: `app/admin/inquiries/page.tsx` now skips any
  underscore-prefixed payload key, so internal bookkeeping never renders as an answer.
- **Stale subtitle** — fixed: now reads "Contact and discovery submissions" (no referral form exists).

---

## 8. Data cleanup at cutover (🟠)

Staging shares the **same Supabase project** as production, so real test data is mixed in.

- Delete tagged inquiries: `delete from inquiries where payload->>'_staging' = 'true';`
- Delete staging page-views: `delete from page_views where is_staging = true;`
- Delete staging interaction-events: `delete from events where is_staging = true;`
- **Applications have no jsonb tag** — delete test applications by `created_at`, and clear the
  orphaned CV files from the private `cvs` storage bucket too.
- Verify no test blog posts / jobs remain published (e.g. `hello-blog-test-1`,
  `test-post-july-21-2026`).

---

## 9. Content still outstanding (🟡)

- **Leadership bios** — real short bios for **Rafael, Roschelle, Karen** in
  `components/about/LeadershipShowcase.tsx` (still placeholder copy). LinkedIn URLs for all 5 are done.
- **Referral program** — CLAUDE.md flags the conditions text as "being checked by lawyer" —
  confirm final copy before launch.
- **Privacy policy analytics wording** — the in-house analytics is cookieless (sessionStorage id,
  no IP / no raw UA / no third-party sharing), so **no cookie-consent banner is required** and the
  policy does not need to name a third-party tool. Just confirm the current wording matches this.

---

## 10. Post-deploy verification (✅ run against the live domain)

- [ ] `robots.txt` serves `Allow` (not `Disallow: /`) and no `x-robots-tag: noindex` header.
- [ ] `sitemap.xml` URLs use `https://www.pplsolutionsinc.com`, not the Vercel host.
- [ ] Canonical / OG tags on a couple pages point at the real domain.
- [ ] Contact form → row lands in `inquiries` (no `_staging` tag) **and** both emails deliver
      (internal notification + visitor auto-reply).
- [ ] Job application → CV uploads to `cvs` bucket, notification email arrives **with the CV attached**.
- [ ] Staff login works with the **rotated** password; `/admin/*` and `/login` redirect correctly
      when unauthenticated.
- [ ] `/api/track` returns `204` and page views land in `page_views` with `is_staging = false`.
- [ ] `/admin/analytics` renders real data; `/admin/inquiries` shows page-journey strips.
- [ ] Old WordPress URL redirects resolve (`/about-us/` → `/about`, `/faq/` → `/resources/faq`, etc.).
- [ ] Mobile responsiveness + `prefers-reduced-motion` sanity check; custom 404.
- [ ] SSL valid (Certbot if VPS); `www` vs apex redirect behaves.
- [ ] Keep WordPress live until DNS cutover is confirmed working; export any needed WP content first.

---

## Quick priority summary

**Must do before public go-live:** unset `STAGING_PASSWORD` · fix `NEXT_PUBLIC_SITE_URL` ·
verify Resend domain + set `RESEND_FROM` · set real `CONTACT_NOTIFY_EMAIL` · rotate admin password ·
resolve Cloudflare DNS access · pick & build the deploy target (VPS vs paid Vercel) · clean staging test data.

**Done (2026-07-23):** `Promise.allSettled` email fix · per-form `JOBS_NOTIFY_EMAIL` routing ·
country-header fallback chain · inquiries `_staging`/subtitle cleanups.

**Strongly recommended alongside:** leadership bios · referral conditions copy.
