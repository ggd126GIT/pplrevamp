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
| `CONTACT_NOTIFY_EMAIL` | `gilbert.dayalo@pplsolutionsinc.com` (monitored test inbox) | **Client-confirmed 2026-07-30 → `sales@pplsolutionsinc.com`.** Cannot be set until the domain is verified: while the sandbox sender is in use Resend rejects any other recipient and the notification is lost. **If unset, internal notifications silently no-op** (`lib/email.ts`). |
| `JOBS_NOTIFY_EMAIL` | unset → job applications currently fall back to the contact inbox | **Client-confirmed 2026-07-30 → `careers@pplsolutionsinc.com`.** Same domain-verification gate as above. Falls back to `CONTACT_NOTIFY_EMAIL` when unset. |
| `SUPABASE_SERVICE_ROLE_KEY` | set (`sb_secret_…`) | Confirm present in prod env — its absence breaks CV upload ("Applications temporarily unavailable") and page-view tracking (`/api/track` no-ops without it). |
| `RESEND_API_KEY` | set | Confirm present. Absence makes all email a silent no-op. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_ANON_KEY` | set | Confirm present (build-time inlined — a change needs a **redeploy**, not just a save). |

> **Vercel note:** `NEXT_PUBLIC_*` vars are inlined at build time. Any change requires a redeploy, not just saving the value.

---

## 2. Email deliverability (🔴 blocker)

- **Resend domain not verified** — blocked by DNS access (see §3). Re-confirmed `not_started` via
  the Resend API on 2026-07-31. Until done, visitor auto-replies bounce; only the signup inbox
  receives mail.
- Plan: verify the **`send.pplsolutionsinc.com` subdomain** in Resend (isolates from the
  company's Microsoft 365 root mail). Cloudflare's Name field is relative — enter the Name column
  verbatim, not the FQDN. The subdomain does not exist yet = clean slate. **Do not touch root
  MX/SPF** (M365).

> **Correction (2026-07-31):** earlier revisions of this file said to add these records as
> "DNS-only / grey cloud". **That is not applicable.** Cloudflare only proxies `A`, `AAAA` and
> `CNAME`; `TXT` and `MX` are always DNS-only and have no proxy toggle. Telling whoever adds them to
> look for a grey cloud will just send them hunting for a control that isn't there. The grey-cloud
> instruction *does* still apply to the `@`/`www` records at cutover — see §3.

### The three records (pulled from the Resend API 2026-07-30, domain id `edd36e88-a1c4-4770-aa24-7c2430e28453`)

Add these in the **`pplsolutionsinc.com`** Cloudflare zone. Names are relative to that zone —
enter them exactly as shown; Cloudflare appends the domain itself.

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey.send` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXuuFuB8+PI8tfU0JmpdXQqj4hu1AKENYxIpZB6SPdvnbXzXiVf47HyJXvR/AqDi5s4wswMhP0WW3L4XMtAGZl5Y93fTMhlLFlyosCXdW5QS+Lu5QAwREqUNTOd3LwfyccBuZ5zKLSnAAJDzR9kSBg5e7NaWlPyKbFTQu6HXZZpQIDAQAB` | — |
| MX | `send.send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
| TXT | `send.send` | `v=spf1 include:amazonses.com ~all` | — |

All three are under `send.` — **none of them touch the root MX or SPF**, so Microsoft 365 mail is
unaffected. After adding, click Verify in Resend; status goes `not_started` → `pending` → `verified`.

Then, and only then: set `RESEND_FROM` to an address `@send.pplsolutionsinc.com`,
`CONTACT_NOTIFY_EMAIL=sales@pplsolutionsinc.com`, `JOBS_NOTIFY_EMAIL=careers@pplsolutionsinc.com`.

✅ **`sales@` and `careers@` exist as real mailboxes in the Microsoft 365 tenant** (confirmed by the
client 2026-07-30). The receiving end is therefore fine — the remaining work is entirely on the
*sending* side, i.e. the three DNS records above. Nobody on the build team has access to those
inboxes, so use the **Where form notifications go** panel on `/admin` to confirm the routing rather
than trying to check the mailboxes directly.

---

## 3. DNS reality for `pplsolutionsinc.com` (🔴 THE ONLY REMAINING BLOCKER)

- **Hostinger is registrar only** — its DNS panel says "DNS managed elsewhere".
  **Never accept its "switch nameservers to Hostinger" offer** — it would move the zone and can drop records.
- **Authoritative NS = Cloudflare** (`yisroel` / `kristin.ns.cloudflare.com`), in a Cloudflare
  account **the build team does not control.** Adding the domain to your own Cloudflare only
  opens the lossy onboarding scan — do not complete it / do not change nameservers.
- Company mail = **Microsoft 365**; root SPF `v=spf1 include:spf.protection.outlook.com -all`.

### Who has access (identified 2026-07-31)

**Rafael Dayalo ("RD") set up the Microsoft 365 tenant and has offered to configure DNS.** That is
almost certainly the route in: standing up M365 requires creating the MX, SPF, `autodiscover`,
`enterpriseregistration` and `MS=` verification records, and all of those are in this zone.

Corroborating evidence: the Let's Encrypt certificate for `w2.pplsolutionsinc.com` was issued
**2026-07-05 05:07 GMT**, the hour the VPS was provisioned. An HTTP-01 challenge can only succeed if
the name already resolves to the box, so **somebody wrote an A record into this live zone that day**.

### Two separable asks — do not bundle them

1. **Resend records (§2).** Purely additive, three new names under `send.`, cannot affect anything
   live. **Push for this now**, independently of any launch decision — without it every contact
   form submission and job application is collected silently with nobody notified.
2. **Cutover records (`@` and `www`).** Modifies two existing records. Needs the client's go-ahead
   and a recorded rollback target. These two *are* proxy-toggled records, so the grey-cloud/
   orange-cloud ordering in `DEPLOY-VPS.md` Phase E genuinely matters here.

---

## 4. Deployment target decision (✅ RESOLVED — VPS, and it is live)

- **Decided and done 2026-07-31: the Hostinger VPS.** The site is deployed, serving and verified at
  **`https://w2.pplsolutionsinc.com`**, gated and `noindex`. Node 22 · PM2 (systemd-persisted,
  resurrection tested) · nginx · Let's Encrypt. Full record in `DEPLOY-VPS.md`.
- **nginx already answers for `pplsolutionsinc.com` and `www`**, apex 301s to www in one hop, and
  `/var/www/ppl/cutover.sh` performs the go-live as a single command with a DNS pre-flight guard
  that refuses to half-apply. All inert until DNS moves.
- **Release process:** `ssh gilbertd@187.127.121.54 '/var/www/ppl/deploy.sh'`. Note that pushing to
  `master` does **not** deploy the VPS — it still auto-deploys Vercel. Expect a brief 502 right
  after each deploy (`pm2 reload` on a single instance is not zero-downtime); retry before treating
  it as a failure.
- **Vercel staging is still live** and still auto-deploys. Two environments now run off the same
  branch against the same Supabase project. **Decide when to retire the Vercel one** — the Hobby
  plan is licensed non-commercial and is not a long-term home for a client site.

> **§1 note:** the env-var table above is written against Vercel. On the VPS these live in
> `/var/www/ppl/.env.production` (0600), and `cutover.sh` already handles the two that change at
> go-live (`NEXT_PUBLIC_SITE_URL`, removing `STAGING_PASSWORD`). The Resend three still need
> setting by hand once the domain verifies.

### VPS-specific gotcha — country tracking (✅ resolved)
- `x-vercel-ip-country` only exists on Vercel and would go `null` on the VPS. Now handled by
  `geoFromHeaders()` (`lib/analytics/parse.ts`, unit-tested), whose country chain tries
  `x-vercel-ip-country` → `cf-ipcountry` → `x-geoip-country` and rejects `XX`/`T1`/malformed values.
- **Still needed on the VPS:** the country only populates if something upstream sets one of those
  headers — either Cloudflare proxying (orange cloud) or the Nginx GeoIP module writing
  `x-geoip-country`. Without either, `country` stays null (harmless; nothing displays it yet).
- **Confirmed on the live VPS 2026-07-31:** a real tracked page view landed with
  `country`/`region`/`city` all **null**, exactly as predicted — no Vercel headers, and no
  `cf-ipcountry` while `w2` is grey-clouded. Country will start populating the moment the proxy goes
  orange at cutover. Nothing to fix; noted so it isn't mistaken for a regression.
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

- ~~**Leadership bios**~~ — ✅ **RESOLVED 2026-07-29.** Client-supplied bios for all five leaders
  are live in `components/about/LeadershipShowcase.tsx`; no placeholder copy remains. LinkedIn URLs
  for all 5 were already done. "Karen Clarissa Porras" corrected to **"Clari Porras"**.
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

## Quick priority summary *(rewritten 2026-07-31)*

**The only external blocker left is Cloudflare DNS access (§3).** Everything the build team can do
without it is done.

**Handled automatically by `cutover.sh`** — no longer things to remember: unset `STAGING_PASSWORD` ·
`NEXT_PUBLIC_SITE_URL` · certificate for the real domain · rebuild.

**Still to do by hand, and possible today (no Cloudflare needed):**
- Rotate the `admin12345` password (§5)
- Staging data cleanup SQL (§8) — inquiries, page_views, events, test applications + orphaned CVs
- Delete junk posts (`hello-blog-test-1`, `test-post-july-21-2026`, `test`, the EV-battery article)
  and test jobs
- Referral conditions copy — still "being checked by lawyer" (§9)
- The 60-vs-100 years figure — still unconfirmed by the client
- Tina's second bio paragraph is missing from server-rendered HTML (crawlers don't see it; ~15 min)
- Decide when to retire Vercel staging (§4)

**Needs Cloudflare, in this order:**
1. Resend's three `send.` records → then set `RESEND_FROM`, `CONTACT_NOTIFY_EMAIL=sales@`,
   `JOBS_NOTIFY_EMAIL=careers@` and redeploy. **Ask for this now — it is additive and risk-free.**
2. Record the current `@`/`www` values (the only rollback to WordPress), then cutover per
   `DEPLOY-VPS.md` Phase E.

**Done:** deploy target chosen and built (§4) · `Promise.allSettled` email fix · per-form
`JOBS_NOTIFY_EMAIL` routing · country-header fallback chain · inquiries `_staging`/subtitle
cleanups · leadership bios · server port exposure closed.
