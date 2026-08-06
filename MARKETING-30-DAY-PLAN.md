# 30-Day Plan — first leads from pplsolutionsinc.com

**Written:** 2026-08-06 · **Window:** 6 Aug – 5 Sep 2026
**Site went live:** 2026-08-04. Everything below is measured from the two days since.

---

## Where we actually are

| Measure | Value | Source |
|---|---|---|
| Sessions since launch | **101** (546 page views) | `page_views` |
| Reached `/contact` | **20** (20% of sessions) | `lead_funnel(30)` |
| Started filling a form | **0 real** (1 event, ours, while building) | `events` |
| **Enquiries** | **0** | `inquiries` |
| Sessions carrying a UTM | 3 in 30 days | `page_views` |
| Visibility for `outsourc*` queries | **zero** | Search Console |

Traffic by first-touch source: direct 85, google 6, **chatgpt.com 4**, ugm.netsapiens.com 3,
bing 1, considerin.net 1, linkedin 1.

**Three findings drive this plan:**

1. **The leak is upstream of the form.** 80 of 101 visitors never reach `/contact` at all. Rewriting
   the contact form would fix nothing.
2. **We do not rank for what the business sells.** Zero impressions for outsourcing queries; most
   Search Console impressions are brand confusion with *PPL Electric*.
3. **Almost all traffic is "direct"** — meaning no campaign, no referrer, largely people who already
   know the name. There is no acquisition channel running.

**What 30 days can and cannot do.** SEO will not produce rankings in a month; that work compounds
over quarters. What this month can realistically deliver is: a funnel proven to work end to end, the
upstream leak closed, the compounding content work started, and **the first leads out of traffic we
already have.**

**Success at day 30** = the funnel verified working, contact-page reach up from 20% toward 35%, at
least **3–5 genuine enquiries**, and a content engine running with an owner and a cadence.

---

## Week 0 — Days 1–2: prove the machine works

Nothing else in this plan is worth doing until this is done.

| # | Action | Owner |
|---|---|---|
| 0.1 | **Submit the contact form once on live.** | **Gilbert / client** |
| 0.2 | Confirm the enquiry lands in `sales@`, appears in `/admin/inquiries`, and carries attribution | Us |
| 0.3 | Confirm `form_start` fired for that real browser | Us |

**Why this is first and blocking.** We have 20 sessions on `/contact` and zero form events. That is
either a brutal drop-off worth designing against, or the tracking does not fire for real visitors —
and **we cannot tell which**. Every capture decision below depends on knowing. It has already been
raised twice.

Ruled out already: Turnstile is correctly configured, `/api/contact` is alive and rejects tokenless
probes, and `sales@` / `careers@` are confirmed receiving.

---

## Week 1 — Days 3–9: stop the leak, claim the ground

Highest value per hour in the whole month, because it works on traffic that already exists.

### Ours to build

| # | Action | Why |
|---|---|---|
| 1.1 | **Add `CtaBand` to `/careers`, `/contact` and `/blog`** | It is absent from all three. These are the pages people land on and leave from. Directly targets the 80% who never reach `/contact`. |
| 1.2 | **Add `BlogPosting` / `Article` JSON-LD to posts** | Posts currently have **no structured data at all**, so Google cannot read a post's date, author or headline. The blog is our entire SEO play and it is invisible as content. ~1 file. |
| 1.3 | **Internal links from blog posts into `/services`** with descriptive anchor text | Anchor text is one of the few signals telling Google what `/services` is about. We just fixed the hero button; posts should do the same. |
| 1.4 | **Re-run the funnel** at day 9 and compare | 1.1 is a hypothesis, not a fact. Measure it. |

### Client's to supply

| # | Action | Why |
|---|---|---|
| 1.5 | **Claim / verify the Google Business Profile** | Free, fast, and the single best fix for *PPL Electric* brand confusion. Also unlocks local "BPO Philippines" style discovery. |
| 1.6 | **Confirm the target keyword list** — the services in their words | We cannot write for search without knowing what to rank for. **Blocks all of Week 2.** |
| 1.7 | **Decide: paid budget, or organic only?** | Changes the whole second half of the month. See Week 3. |

---

## Week 2 — Days 10–16: content that can actually rank

Blocked on 1.6. If keywords are not supplied, this week stalls — say so early.

| # | Action | Owner |
|---|---|---|
| 2.1 | Rewrite `/services` around the confirmed keywords — depth, not decoration | Us + client copy |
| 2.2 | Publish **2 posts** aimed at real buying questions, e.g. "What does offshoring to the Philippines actually cost?" and "How to choose a BPO partner" | Client writes, we publish |
| 2.3 | Submit updated sitemap; request indexing for `/services` and new posts | Us |
| 2.4 | Set up **UTM discipline** — every outbound link (LinkedIn, email signature, proposals) tagged | Us + client |

**On 2.4:** only 3 sessions in 30 days carried a UTM. Attribution is fully built and measuring
nothing, because nothing is tagged. This costs an hour and makes every later decision evidence-based.

---

## Week 3 — Days 17–23: proof, and the first outbound

B2B BPO buyers shortlist on evidence. We have none on the site.

| # | Action | Owner |
|---|---|---|
| 3.1 | **Case studies** — even anonymised ("a US healthcare provider, 40 seats, 30% cost reduction") | **Client** |
| 3.2 | **Testimonials** with permission to attribute | **Client** |
| 3.3 | Build a proof section into `/services` and the homepage | Us |
| 3.4 | **Unlock the referral programme** — the page is built and works, but is unlinked pending legal sign-off | **Client (legal)** |
| 3.5 | LinkedIn: post the two Week-2 articles from the company page, UTM-tagged | Client |

**On 3.4:** a finished referral channel is sitting switched off. Referral is the highest-converting
channel most BPOs have. This is a lawyer's signature, not a build.

**If a paid budget was approved (1.7):** start a small, tightly-targeted LinkedIn or Google Ads test
here — enough to buy *data*, not volume. The tracking to measure it already exists.

---

## Week 4 — Days 24–30: measure, then decide

| # | Action |
|---|---|
| 4.1 | Full funnel read: sessions → `/contact` → started → submitted, by source |
| 4.2 | Search Console: are we appearing for *any* `outsourc*` query yet? Impressions matter this early, not clicks |
| 4.3 | Lead quality review with the client — of any enquiries received, how many were real prospects? |
| 4.4 | Decide month 2: more content, or paid acquisition |

---

## What we need from the client, in priority order

1. **Target keywords / services in their words** (1.6) — blocks Week 2 entirely
2. **Google Business Profile access** (1.5)
3. **Case studies and testimonials** (3.1, 3.2) — the biggest credibility gap on the site
4. **Referral programme legal sign-off** (3.4) — a finished channel, switched off
5. **Paid budget: yes or no** (1.7)
6. **Who writes the blog, and how often** — the CMS is built and needs an owner
7. **Is there a CRM?** — decides whether leads export or live in the admin panel
8. **What counts as a qualified lead, and who owns follow-up** — the status field is live but its
   definitions are currently our guess

---

## Explicitly not in this plan

- **Paid ads at scale.** Not before the funnel is proven; buying traffic into an unmeasured funnel
  wastes the budget and the learning.
- **Marketing email / newsletter.** Resend is configured transactional-only; bulk sending is a
  separate deliverability problem.
- **A site redesign.** The measured problem is routing and content, not the design.
- **Chatbot / live chat.** Needs staffing to be worth anything.

---

## Honest risks

- **The 30-day window is short for SEO.** Rankings realistically move in months 2–4. Judge this month
  on leaks closed, measurement working, and first leads — not on rankings.
- **Weeks 2–3 are client-blocked.** Keywords, case studies and testimonials cannot be invented by us.
  If they do not arrive, this becomes a two-week plan.
- **Traffic quality is unverified.** 546 views across 101 sessions in 3 days is high for a new site.
  There is a bot filter, but if a chunk is automated the funnel percentages are flattering.
- **Four job posts expire 17–24 Aug.** `/careers` is a live entry point; letting it empty mid-month
  removes a landing page.
