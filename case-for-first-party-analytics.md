# Analytics: the case for keeping what we have

**Prepared:** 2026-08-07 · **Site:** https://www.pplsolutionsinc.com
**Written to be sent as-is.**

A note on the suggestion to add Google Analytics. The short version: we already
have analytics, they are more complete than GA4 would be on this site, and
adding GA4 carries a compliance cost that is easy to underestimate. We think the
right answer is to keep first-party as the source of truth and revisit GA4 when
there is paid acquisition to measure.

Here is the reasoning, including where GA4 genuinely would be better.

---

## 1. What the site already measures

This is not a gap being defended — it is a working panel at `/admin/analytics`,
in use today:

- **Views per day**, with a trend chart
- **Top pages**
- **Top sources** — where visitors arrived from, including campaign tags
- **Geography** — country, region and city, plus a *services-page-specific*
  breakdown, so you can see which markets are reading the commercial pages
- **Section reach** — how far down each page visitors actually get. The pinned
  3Ds sequence, the About introduction, the industries reveal all sit below the
  fold; this measures whether anyone reaches them. GA4 does not do this without
  custom event work.
- **Click tracking** on the things that matter — phone, email, share links, CTAs
- **Lead funnel** — visits through to submitted enquiries
- **Per-enquiry journey** — for each individual enquiry in the admin panel, the
  pages that person viewed before submitting, and the source that first brought
  them in

That last one is worth dwelling on. When a lead arrives, you can see the path
that produced it, attached to that specific enquiry. GA4 deliberately cannot do
this — it aggregates and thresholds precisely to avoid identifying individuals.

## 2. The compliance cost of adding GA4

The site currently sets **no cookies at all**. That is not an accident, and it
is not free to give up:

- There is **no cookie-consent banner** anywhere on the site, because none is
  required.
- The privacy policy states in writing that the company uses *"its own
  first-party, cookieless analytics"* and that *"no cookies are used for this
  purpose."* It is a genuine Data Privacy Act 2012 statement with a named
  contact, not boilerplate.

GA4 sets cookies. Adding it is therefore not a tag drop, it is three pieces of
work: the GA4 property and tag, a consent banner that actually gates the tag
before it fires, and a privacy-policy rewrite naming Google as a processor. Call
it a day's work, plus a permanent banner on every first visit.

## 3. The part that is usually missed: consent shrinks the data

Once a consent banner exists, GA4 only sees the visitors who accept it. Decline
and ignore rates in banner regimes are routinely 20–50%. So the trade is:

> A **complete** first-party dataset is replaced, as the headline number, by a
> **partial** GA4 dataset — and the two will never agree.

The site launched on 4 August. Traffic is at launch volumes and will be modest
for months. Suppressing an already-small sample by a third, and then explaining
every month why two dashboards disagree, is a poor trade at this stage.

## 4. Where GA4 genuinely is better

We would not argue otherwise on these:

- **Google Ads integration.** If paid search runs, GA4 is how conversions get
  back to the ad platform for bidding. There is no first-party substitute.
- **Remarketing audiences.** Building audiences to retarget requires Google's tag.
- **Multi-touch attribution modelling.** Ours records first touch. GA4 models
  across touchpoints.
- **Cross-device identity**, demographics and interest categories (all of which
  require consent anyway).
- **Familiarity.** It is the industry default, and an agency reporting against
  GA4 has tooling built around it.

If any of those is the actual requirement — particularly the first two — that is
a real reason and we should plan it properly rather than resist it.

## 5. Worth knowing: Search Console is separate

If what is wanted is search performance — queries, impressions, click-through,
ranking — that is **Google Search Console**, not Analytics. It is already
connected, needs no cookies and no banner, and we can share access immediately.
A good deal of what people expect from "add Google Analytics" is actually
sitting in Search Console already.

## 6. Recommendation

1. **Keep the first-party analytics as the source of truth.** They are complete,
   consent-free, and already answer the questions being asked of them.
2. **Share Search Console access now** for search performance.
3. **Add GA4 when paid acquisition starts** — at that point the ad-platform
   integration justifies the consent banner and the policy rewrite, and we scope
   all three together rather than shipping a tag that quietly makes the privacy
   policy inaccurate.

Happy to walk through the existing panel on a call — it is easier to judge
against a live screen than a description.
