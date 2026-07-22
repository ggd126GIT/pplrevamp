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
| `CONTACT_NOTIFY_EMAIL` | `gilbert.dayalo@pplsolutionsinc.com` (monitored test inbox) | Switch to the real destination inbox (e.g. `sales@pplsolutionsinc.com`). **If unset, internal notifications silently no-op** (`lib/email.ts:57`). |
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

### VPS-specific gotcha — country tracking (🟠)
- `app/api/track/route.ts:54` reads `x-vercel-ip-country`. **This header only exists on Vercel**
  and will silently be `null` on the VPS, so the analytics `country` column stops populating.
- Recommended fix (undecided): fallback chain
  `x-vercel-ip-country` → `cf-ipcountry` (if fronted by Cloudflare) → `x-geoip-country` (Nginx GeoIP).
  Nothing in the admin UI displays country yet, so this is non-urgent but should be resolved before
  relying on the metric.

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

## 6. Email-send correctness bugs (🟠 should-fix)

All three public form routes use `Promise.all` for the two concurrent sends:
- `app/api/contact/route.ts:75`
- `app/api/discovery/route.ts:69`
- `app/api/apply/route.ts:116`

**Problem:** `Promise.all` rejects on the first failure. In Resend **test mode**, the visitor
auto-reply rejects for any non-signup recipient, which aborts the batch and can leave the internal
notification's request in flight when a serverless function freezes → **internal notification
silently lost.** After domain verification this is less likely but still latent for any single
send failure.
**Fix:** switch to `Promise.allSettled` and log individual failures.

### Per-form notification routing (🟠)
- `sendInternalNotification` has no recipient param — it always targets the single module-level
  `NOTIFY` (`CONTACT_NOTIFY_EMAIL`, `lib/email.ts:4`). Consider adding an optional `to` and a
  `JOBS_NOTIFY_EMAIL` (e.g. `jobs@`) for `/api/apply`, falling back to `CONTACT_NOTIFY_EMAIL`.
  Reminder: an unset notify var makes the send a silent no-op (`lib/email.ts:57`).

---

## 7. Admin UI cleanups (🟡)

- **`_staging` junk field on inquiry cards** — `app/admin/inquiries/page.tsx:64` renders every
  payload key, so staging rows show a literal "Staging: true" field. Either filter `_staging` out
  of the render, or rely on the cutover cleanup (below) to remove those rows.
- **Stale subtitle** — `app/admin/inquiries/page.tsx:32` reads "Contact, discovery, and referral
  submissions" but **no referral form exists** on the site. Drop "referral".

---

## 8. Data cleanup at cutover (🟠)

Staging shares the **same Supabase project** as production, so real test data is mixed in.

- Delete tagged inquiries: `delete from inquiries where payload->>'_staging' = 'true';`
- Delete staging page-views: `delete from page_views where is_staging = true;`
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

**Strongly recommended alongside:** `Promise.allSettled` email fix · country-header fallback (if VPS) ·
inquiries `_staging`/subtitle cleanups · leadership bios.
