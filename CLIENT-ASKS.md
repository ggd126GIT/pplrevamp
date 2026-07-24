# Client Asks — everything blocked on .ppl Solutions

**Compiled:** 2026-07-24 · Companion to `PRE-LAUNCH-CHECKLIST.md` (that file is the *technical*
cutover list; this one is only what **the client must give us or decide**).

Staging for review: https://pplrevamp.vercel.app — user `ppl`, password `Jaax4PvOUvE9`

Legend: 🔴 hard blocker (cannot launch) · 🟠 needed at launch · 🟡 quality / nice-to-have

---

## 1. Access & accounts (🔴 nothing ships without these)

| # | What we need | Why it's blocking |
|---|---|---|
| 1.1 | **Cloudflare account access** for the `pplsolutionsinc.com` zone (or have its owner add records for us) | This is the single biggest blocker. Hostinger is registrar only — DNS is authoritative at Cloudflare in an account we don't control. Without it we cannot (a) verify the domain in Resend so **customer confirmation emails will keep bouncing**, and (b) point the domain at the new site at cutover. |
| 1.2 | **Who owns / manages that Cloudflare account?** (agency, ex-developer, IT provider) | We need a name and contact route. If nobody knows, we need a fallback plan — nameserver change is possible but risks dropping records, including their Microsoft 365 mail. |
| 1.3 | **Hostinger registrar login** (or confirmation the client can act on it) | Needed at cutover in case nameservers or domain settings must change. |
| 1.4 | **WordPress admin access to the current live site** | To (a) export any blog/page content they want carried over, and (b) get the full list of existing URLs so old links keep working (redirects). Right now we're guessing at `/about-us/`, `/faq/` etc. |
| 1.5 | **VPS details** — host/IP, SSH access, sudo — *if they choose the VPS route* (see 2.1) | The original spec targets their VPS (PM2 + Nginx + Certbot). Not started, and can't start without access. |
| 1.6 | **Do they already have Google Search Console / Google Analytics / Google Business Profile?** If yes, ownership access. | So the new site inherits verification and history instead of starting from zero. (Note: our analytics is built in-house and needs no Google account — this is only about preserving what they may already have.) |

---

## 2. Decisions only the client can make (🔴 / 🟠)

| # | Decision | Context / our recommendation |
|---|---|---|
| 2.1 | 🔴 **Hosting: their VPS, or a paid Vercel plan?** | Currently on Vercel's free Hobby plan, which is licensed for **non-commercial use only** — fine for review, not for a live company site. VPS = per the original spec, no monthly SaaS fee, but the whole PM2/Nginx/SSL setup still has to be built and tested, **and visitor city/region analytics will stop working** unless we add an Nginx GeoIP module (country-level still works). Vercel Pro ≈ $20/month and everything already works as-is. |
| 2.2 | 🔴 **When do we go live?** Explicit sign-off needed. | The site is currently password-gated and hidden from Google on purpose. Removing the password makes it public and indexable — that's the go-live switch, and it's the client's call. |
| 2.3 | 🟠 **Which email inbox receives what?** | Contact/discovery enquiries currently route to a test inbox. We need: the real destination for **sales enquiries** (currently `sales@pplsolutionsinc.com` — confirm it exists and is monitored), and optionally a separate inbox for **job applications** (e.g. `jobs@` / `careers@`). |
| 2.4 | 🟠 **Do they want a physical office address on the site?** | There is **no address anywhere** on the site right now — contact page shows email, phone and response time only. Most B2B/BPO buyers look for one. If yes, we need the exact address (and whether they want a map). |
| 2.5 | 🟠 **Business/operating hours?** | The contact page currently just says "we typically reply within 1–2 business days." If they want stated hours (and timezone — PH vs US client-facing), we'll add them. |
| 2.6 | 🟠 **Which job openings are real at launch?** | Four roles are currently listed as **open**: Customer Service Associate, Finance & Accounting Specialist, **Lawyer**, **Marketing Associate**. Some of these were seeded/test data. We need the actual list to publish, or we take careers live with an empty state. |
| 2.7 | 🟠 **Blog: launch with content, or leave it empty?** | Five posts are published, and **four are test/dummy content** ("Hello Blog Test 1", "Test Post July 21 2026", "Test", plus an unrelated EV-battery article). All test posts get deleted at cutover. So: do they supply real articles, should we migrate posts from WordPress, or does the blog launch empty until they write? |

---

## 3. Content still outstanding (🟠)

| # | Item | Current state |
|---|---|---|
| 3.1 | **Leadership bios for Rafael Dayalo, Roschelle Del Rosario and Karen Clarissa Porras** | The About page shows all five leaders. Joey's and Tina's bios are real; the other three are **placeholder copy we wrote** — plausible but invented. Needs 1–2 real sentences each (`components/about/LeadershipShowcase.tsx`). |
| 3.2 | **Referral programme conditions — legal sign-off** | The project spec flags this text as "being checked by lawyer". The conditions are live on `/resources/referral`. We need the lawyer-approved final wording, or confirmation the current text stands. |
| 3.3 | **"60 years" vs "100+ years" combined experience — which is correct?** | Inconsistent on the site today: the About page, leadership heading and home stats all say **100+ years**; the FAQ answer still says **more than 60 years** (`lib/content.ts:255`). One number, everywhere. We'll fix once they confirm. |
| 3.4 | **Job descriptions** for whichever roles from 2.6 are real | Department, location, work mode (onsite/WFH/hybrid) and the description text for each. |
| 3.5 | **Real job/blog content owner** — who on their side will maintain these after launch? | They get a staff admin panel (blog + jobs + applications + enquiries). Worth naming the person now so we set up their login properly rather than sharing a generic one. |
| 3.6 | **Confirm the phone number and who answers it** | `+1.814.747.5335` is live on the contact page and footer. It's a US number — confirm it's correct and monitored, and whether a PH number should also be shown. |
| 3.7 | **Confirm official social links** | We have LinkedIn `linkedin.com/company/ppl-solutions-inc` and Facebook `facebook.com/pplsolutionsinc` in the footer. Confirm both are the official pages, and whether anything else should be listed (Instagram, X, YouTube). |
| 3.8 | **Data Protection Officer for the privacy policy** | The DPA-2012 privacy policy currently lists `sales@pplsolutionsinc.com` as the DPO contact. Philippine law expects a named DPO — we need the officer's name and a proper contact address. |
| 3.9 | 🟡 **Brand assets** — high-resolution logo (ideally SVG), and a favicon source | We're working from a PNG lifted off the old site. A vector logo would sharpen the header, favicon and social share images. |
| 3.10 | 🟡 **Real photography** | Several page banners and the blog fallback image use whatever we could pull from existing assets. Real office/team photos would lift the site noticeably. (A handful of supplied assets are also going unused — happy to swap any of them in.) |

---

## 4. Things we'll handle — no client input needed

Listed so nothing looks unaccounted for: rotating the admin password, deleting all staging test data,
switching the site URL/email sender/analytics flags at cutover, redirects, SSL, sitemap and SEO tags,
and the post-launch verification pass. All tracked in `PRE-LAUNCH-CHECKLIST.md`.

---

## Suggested order to raise with the client

1. **Cloudflare access** (1.1 / 1.2) — longest lead time, blocks both email and the domain switch. Ask first.
2. **Hosting decision** (2.1) — determines whether we need VPS credentials and a deploy build.
3. **Go-live date** (2.2) and **email routing** (2.3).
4. **Content batch** (3.1–3.4) — bios, legal wording, the experience number, real job posts. Can be gathered in parallel.
5. Everything 🟡 — brand assets and photography — can follow after launch without holding it up.
