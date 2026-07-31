# Pre-Launch / Production Cutover Checklist

**Project:** .ppl Solutions, Inc. website revamp (Next.js 16 + Supabase + Resend)
**Purpose:** Everything that must be reviewed / changed before pointing the real domain
(`pplsolutionsinc.com`) at the new site. Compiled 2026-07-23.

Legend: 🔴 blocker (site is wrong/broken in prod without it) · 🟠 should-fix (correctness/quality) · 🟡 content/polish · ✅ verify after deploy

---

## 1. Environment variables (🔴 partially resolved)

These are currently set for **Vercel staging** and will produce a broken or leaky
production site if not changed at cutover.

> **VPS status 2026-07-31 — read this before acting on the table below.** The three email vars are
> **already correctly set on the VPS** (`/var/www/ppl/.env.production`, 0600): `RESEND_FROM` =
> `noreply@send.pplsolutionsinc.com`, `CONTACT_NOTIFY_EMAIL` = `sales@`, `JOBS_NOTIFY_EMAIL` =
> `careers@`. Ignore the "cannot be set until verified" caveats — the domain **is** verified (§2).
>
> Still outstanding on the VPS, and both handled automatically by `/var/www/ppl/cutover.sh`:
> **`STAGING_PASSWORD` must be removed** and **`NEXT_PUBLIC_SITE_URL` set to
> `https://www.pplsolutionsinc.com`**. The latter *does* need a rebuild (`NEXT_PUBLIC_*` is inlined at
> build time); the email vars did not.
>
> The table's "Staging value now" column describes **Vercel**, which still runs the sandbox sender.

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

## 2. Email deliverability (✅ RESOLVED 2026-07-31)

**`send.pplsolutionsinc.com` is VERIFIED and the VPS is configured and reloaded.** The three records
below are live in the zone; `RESEND_FROM=".ppl Solutions <noreply@send.pplsolutionsinc.com>"`,
`CONTACT_NOTIFY_EMAIL=sales@pplsolutionsinc.com` and `JOBS_NOTIFY_EMAIL=careers@pplsolutionsinc.com`
are set in `/var/www/ppl/.env.production`. A live send to an `@pplsolutionsinc.com` M365 mailbox
returned `last_event: delivered`. Full detail in `DEPLOY-VPS.md` Phase D.

**Still unproven:** an end-to-end form submission actually landing in `sales@` / `careers@` — nobody
on the build team can read those mailboxes. Confirm routing via `/admin` → *Where form notifications
go*, and get a .ppl staffer to confirm first receipt. Also tell them traffic is about to start.

> ⚠ These vars are **not** set on Vercel, only on the VPS. If Vercel staging is kept alive, it still
> runs the sandbox sender.

### Historical (the blocker, now cleared)

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

## 3. DNS reality for `pplsolutionsinc.com` (✅ ACCESS RESOLVED 2026-07-31)

**The live zone is reachable** in **Rafael Dayalo's Cloudflare account
`454ea7705ae85d1d070d68fe918a93d9`** — confirmed live by its SOA (`kristin.ns.cloudflare.com`) and by
containing `w2 A 187.127.121.54`. Authoritative export committed at
`docs/dns/pplsolutionsinc.com-zone-export-2026-07-31.txt`.

- **Rollback target for cutover: `46.202.186.187`** (WordPress on Hostinger shared hosting). Cutover
  is reversible with one DNS edit — earlier revisions of this file and `DEPLOY-VPS.md` wrongly said
  otherwise.
- **`@`/`www` TTL is Auto (~5 min)** — no need to pre-lower TTL before cutover.
- **Do not touch the four `*.eoidentity.com` CNAMEs** (`56832594`, `eo._domainkey`, `eom`, `eot`).
  They are **EmailOctopus**, running .ppl's email marketing: `eom` is its Return-Path domain, `eot`
  its click tracking. Keep all four **DNS-only** — see the SSL/TLS warning in `DEPLOY-VPS.md` Phase E
  step 6.
- **An obsolete duplicate zone** exists in the build team's own account (`697abb73…`,
  `rocky`/`rosemary`). Inert. Never edit or activate it; consider deleting it.

**What remains is no longer access — it is the client's go-ahead on cutover timing.**

### Historical (the access blocker, now cleared)

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

## 8. Data cleanup at cutover (🟠 — CORRECTED 2026-07-31, the flag-based deletes are not enough)

Staging shares the **same Supabase project** as production, so real test data is mixed in.

### ⚠ Use a DATE cut, not the staging flag

**The `is_staging` / `_staging` filters miss most of the test data.** Those flags are only set when
`STAGING_PASSWORD` is present, so **every row generated by local `npm run dev` is written with
`is_staging = false` / no tag** — indistinguishable from real production traffic except by date.

Measured against the live database on 2026-07-31:

| Table | Flagged as staging | **Missed by the flag filter** | Dates |
|---|---|---|---|
| `page_views` | 382 | **315** (`is_staging=false`, local dev) | 07-22 → 07-30 |
| `events` | 284 | **348** (`is_staging=false`, local dev) | 07-24 → 07-30 |
| `inquiries` | 8 tagged | **4 untagged** — a mix of rows predating the tag (added 07-22 in `d032b51`) and local-dev submissions, the most recent on **07-31** | 07-21 → 07-31 |
| `applications` | n/a — no tag column | **2** | 07-21 → 07-22 |

Left alone, that is ~660 phantom page views and events plus 4 test inquiries counted as launch-day
production traffic.

**So delete by date instead** — everything predates cutover, so one cut handles both flagged and
unflagged rows. Substitute the actual cutover timestamp:

```sql
-- run these AFTER the cutover moment, so nothing real is caught
delete from events      where created_at < '2026-08-01';   -- <- cutover date
delete from page_views  where created_at < '2026-08-01';
delete from inquiries   where created_at < '2026-08-01';
delete from applications where created_at < '2026-08-01';
```

Keep the flag-based deletes below only as a *supplement*, for any staging rows created after cutover
(e.g. if `w2` is kept alive as a gated staging environment alongside production — in which case the
flag becomes genuinely useful and the date cut must not be re-run):

```sql
delete from inquiries  where payload->>'_staging' = 'true';
delete from page_views where is_staging = true;
delete from events     where is_staging = true;
```

### Also

- **Applications have no jsonb tag** — covered by the date cut above. Clear the orphaned CV files from
  the private `cvs` storage bucket too; deleting the rows does not remove the uploads.
- Verify no test blog posts / jobs remain published (e.g. `hello-blog-test-1`,
  `test-post-july-21-2026`, `test`, the unrelated EV-battery article; test jobs `lawyer` and
  `marketing-associate`).
- **Do not delete the `activity` table's rows** — it is append-only by design and its history of who
  edited what is worth keeping across cutover.

---

## 9. Content still outstanding (🟡)

### 🔴 Job postings are duplicated and need real client copy (found 2026-07-31)

**All seven open jobs were carrying the same content.** Diagnosed as data entry from 2026-07-28, not
a code bug: `app/(site)/careers/page.tsx` maps and renders per job correctly. The giveaway was
`email-and-social-media-lead`, whose value was the shared blurb **plus `"ort description"`** — the
tail of the admin form's own "Short description" label, left by a paste-over.

**Done:** the seven identical `short_description` values (a *Customer Support Representative* blurb
matching none of the titles) were set to `NULL`. The card guards with
`{job.short_description && …}`, so listings now render cleanly with no teaser rather than a wrong
one. Removed text is recoverable — it is real copy for a customer-support role, just pasted onto
every other job.

**⚠ NOT fixed — the long `description` bodies are still duplicated, and this matters more:**

| Slug | Long description |
|---|---|
| `marketing-associate` · `project-manager` · `email-and-social-media-lead` | **byte-identical**, 2739 chars |
| `sdr-jap-bilingual` · `business-intelligence-lead` | **byte-identical**, 1880 chars |
| `lawyer` | 159 chars of test text (`"Lawyer 07 29 2026…"`) |
| `finance-accounting-specialist` | 483 chars, the original seed copy |

So two different job detail pages currently serve the same body. **This is a launch blocker** — all
seven are `status = 'open'` and therefore live.

**Needs the client, and must not be written by us.** These are real postings that applicants read;
inventing responsibilities or qualifications would be fabricating employment terms on .ppl's behalf.
Ask them for:

1. **Which of the seven are genuine openings.** `lawyer` and `yoga-instructor` (closed) are known
   test entries, but `SDR Jap Bilingual` and `Business Intelligence Lead` look real. **This
   supersedes the older §8 note naming only `lawyer` and `marketing-associate` as test jobs.**
2. **A per-job description** for each genuine one.
3. **A one-or-two-sentence teaser** per job for the listing card (optional — cards look fine without).

**Attribution is unavailable for this batch:** `created_by` is `null` on everything from 07-28,
because the attribution columns shipped 07-29. Only `lawyer` carries an `updated_by` (Tina Loneza).

> **Editing job data by direct SQL does not refresh the site.** `/careers` and `/careers/[slug]` are
> ISR with `export const revalidate = 60`; `revalidatePath` is only called by the admin actions in
> `app/admin/jobs/actions.ts`. A raw DB write therefore shows up only after the 60s window, and ISR
> serves stale-then-regenerates, so expect to load the page twice. Prefer editing through `/admin/jobs`.

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

## Quick priority summary *(rewritten 2026-07-31, second revision)*

**There is no longer an external access blocker.** Cloudflare zone access exists (§3) and email is
verified and configured (§2). **The remaining gate is the client's go-ahead on cutover timing.**

**Handled automatically by `cutover.sh`** — no longer things to remember: unset `STAGING_PASSWORD` ·
`NEXT_PUBLIC_SITE_URL` · certificate for the real domain · rebuild.

**Still to do by hand before cutover:**
- Rotate the `admin12345` password (§5)
- Staging data cleanup SQL (§8) — inquiries, page_views, events, test applications + orphaned CVs
- Delete junk posts (`hello-blog-test-1`, `test-post-july-21-2026`, `test`, the EV-battery article)
  and test jobs
- Confirm a form submission actually reaches `sales@` / `careers@` (§2) — the one part of email that
  is configured but unproven
- Merge and deploy the `feat/turnstile` branch (12 commits, currently on neither environment), then
  create Turnstile keys — those need **no** client Cloudflare access, any account works
- Referral conditions copy — still "being checked by lawyer" (§9)
- The 60-vs-100 years figure — still unconfirmed by the client
- Tina's second bio paragraph is missing from server-rendered HTML (crawlers don't see it; ~15 min)
- Decide when to retire Vercel staging (§4) — note it still runs the sandbox email sender

**Cutover itself** (client sign-off on timing, then ~15 minutes): grey-cloud `@`/`www` →
`187.127.121.54` · run `cutover.sh` · SSL **Full (strict)** · orange-cloud. Rollback is one edit back
to `46.202.186.187`. No TTL pre-lowering needed. Per `DEPLOY-VPS.md` Phase E.

**Done:** deploy target chosen and built (§4) · **Resend domain verified + VPS email configured
(§2)** · **live zone access + authoritative zone export (§3)** · `Promise.allSettled` email fix ·
per-form `JOBS_NOTIFY_EMAIL` routing · country-header fallback chain · inquiries `_staging`/subtitle
cleanups · leadership bios · server port exposure closed.
