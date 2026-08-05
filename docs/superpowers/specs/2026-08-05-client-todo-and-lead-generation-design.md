# Client TODO + Lead Generation — Design

**Date:** 2026-08-05
**Status:** spec for review — nothing implemented
**Source:** four client-requested items, handed over 2026-08-05

| # | Item as given | What it resolves to |
|---|---|---|
| 1 | "retain scroll down animation, add click action to the numbers (all pages)" | Make the pinned steppers' `01/02/03` clickable, keeping scrub |
| 2 | "should work on any browser and any screen size" | Cross-browser + viewport correctness |
| 3 | "2 secs to auto load for all content (all pages)" | A timeout so revealed content can never stay invisible |
| 4 | "Setup lead generation" | Three separate subsystems — decomposed below |

**Items 1–3 share one root cause** and should be built together. **Item 4 is not one project** and is
decomposed rather than specced as a single unit.

---

## Measured current state

Numbers, not assumptions. Gathered 2026-08-05.

**Traffic since launch (2026-08-04, ~36 hours):** 272 page views, 49 sessions, source recorded on
all 272, UTM on 3.

**Leads: zero.** The `inquiries` table is empty. No contact form, discovery form or job application
has ever been submitted in production.

**Search:** 70 clicks over 3 months on the old WordPress site, and **zero visibility for any
`outsourc*` query** — most impressions are brand confusion with PPL Electric (`[[seo-traffic-baseline]]`).

Three consequences run through everything below:

1. **There is no funnel to optimise yet.** Conversion is 0/49. Nobody can say whether the forms
   convert badly or simply have not been seen. Anything framed as "improve conversion" is guesswork
   until there are leads to compare against.
2. **The scarce input is qualified traffic, not conversion rate.** 49 sessions in two days, with no
   search visibility for the category the business sells into.
3. **Measurement must land before optimisation**, or there is no way to tell whether any later change
   worked.

---

# Part A — Items 1–3: the animation system

## The root cause they share

`app/globals.css`:

```css
.reveal { opacity: 0; transform: translateY(28px); }
.reveal.is-visible { opacity: 1; transform: none; transition: …; }
```

`components/ui/Reveal.tsx` adds `is-visible` when an `IntersectionObserver` fires. **There is no
other path to visible.** If the observer never fires — JS blocked or slow, a browser quirk, a
zero-height parent, an odd viewport, a bfcache restore, a print stylesheet — the content is
invisible **permanently**, not merely unanimated.

The same shape appears in the GSAP components, which set `autoAlpha: 0` in a
`gsap.matchMedia()` block: `ThreeDsPinned`, `ThreeEsPinned`, `MvvReveal`, `IndustriesReveal`,
`AboutIntro`.

That is almost certainly one bug reported three ways: the client saw blank sections, described the
symptom as "doesn't work on some browsers/screens" (item 2), and proposed a fix as "auto load after
2 seconds" (item 3).

**Design principle for all of Part A: content is visible by default; animation is an enhancement that
may fail.** Today it is the reverse.

## A1 — Reveal safety net (item 3)

`Reveal.tsx` gains a 2000 ms timer alongside the observer. Whichever fires first reveals; the other
is cancelled. Force-revealed content appears without the transition, so a late reveal does not look
like a glitch.

Also fixed in the same pass, because they are the same failure:

- **No-JS / JS-failure floor.** A `<noscript>` rule setting `.reveal { opacity: 1; transform: none }`
  so content is visible when JS never runs at all — the timer cannot help there.
- **The GSAP components.** Their `matchMedia` blocks only run inside the matched query. Anything
  outside it must render visible, not hidden. Each of the five gets checked and given a visible
  resting state.

**Why 2000 ms and not shorter:** the timer must not pre-empt normal scrolling. A visitor who scrolls
at a normal pace reaches the second viewport in well under 2 s and sees the intended animation; the
timer only wins when something is wrong. It is a floor, not a feature.

**Tests:** `Reveal` is a `.tsx` client component, and vitest here runs `environment: "node"` and
collects only `**/*.test.ts` — it cannot be unit-tested in place. Extract the decision
(`shouldForceReveal(elapsed, hasIntersected)`) into `lib/reveal.ts` and test that; verify the
component itself in-browser with the observer stubbed out.

## A2 — Clickable stepper numbers (item 1)

**Finding that changes the ask: "all pages" is one page.** The `01/02/03` markers exist in four
places, and only two of them have anything to click *to*:

| Location | Numbers are | Clickable? |
|---|---|---|
| `components/home/ThreeDsPinned.tsx` | stepper driving a pinned scrub sequence | **yes** |
| `components/home/ThreeEsPinned.tsx` | same pattern | **yes** |
| `components/home/ThreeDs.tsx` | decorative watermark, already `aria-hidden="true"` | no — all three steps already visible |
| `app/(site)/resources/how-to-get-started/page.tsx` | watermark on cards | no — all cards already visible |

The last two are mobile / reduced-motion fallbacks and static cards. Every step is already on screen;
a click has no destination. Making them clickable would add a control that does nothing. **Recommend
confirming with the client that "all pages" meant "everywhere this stepper appears", which is the two
home-page sections.**

**How the click works.** Both pinned sections are `ScrollTrigger` timelines with `scrub: 1` — the
timeline position *is* the scroll position, so it cannot be set directly without fighting the scrub.
Clicking step *n* therefore **scrolls the window** to the scroll offset where phase *n* is centred,
and the existing scrub animates the transition for free. No second animation path, no state to keep
in sync, scroll position and visual state stay consistent.

```
offset(n) = trigger.start + (trigger.end - trigger.start) × (phaseCentre(n) / totalDuration)
```

Uses `ScrollTrigger.getById()` bounds rather than hardcoded pixels, so it survives the `end:
"+=" + window.innerHeight * 3` recalculation on resize.

**Accessibility, which this currently fails.** The pills are `<div>`s with a `<span>` inside — not
focusable, not announced, no keyboard path. Making them interactive means making them real controls:
`<button>` with `aria-current="step"` on the active one, visible focus ring, and Enter/Space working
by virtue of being a button. Reduced-motion users get an instant `scrollTo` instead of smooth.

The stepper is desktop-only (`min-width: 1024px`) and motion-safe-only, so on mobile and for
reduced-motion users nothing changes — they get the static grid, as now.

## A3 — Cross-browser and screen size (item 2)

Partly fixed by A1. The rest is verification, and it needs to be honest about what has and has not
been checked.

**Test matrix:** Chrome, Firefox, Safari (macOS + iOS), Edge — at 320, 375, 768, 1024, 1440, 1920 px,
plus 1280×720 (short laptop viewport, worst case for a pinned full-height section).

**Known-risk areas, from reading the code:**

- Pinned sections at short viewport heights — `min-h-screen` plus a pin can trap scroll.
- `100vh` on iOS Safari, where the toolbar changes the viewport mid-scroll.
- `gsap.matchMedia` boundary at exactly 1024 px, and orientation change on tablets.
- The `.pin-spacer` reparenting crash already documented in `[[gsap-pin-wrapper]]`.
- `IntersectionObserver` under bfcache restore (back button) — a restored page may never re-fire.

**Deliverable:** a results table stating what was tested where, with the failures found. "Works on any
browser" cannot be *proven*; the honest output is a matrix with named coverage and named gaps.
Safari/iOS in particular needs a real device or a paid cloud service — flagging now rather than
quietly skipping it.

---

# Part B — Item 4: lead generation

The client picked all three of capture, tracking, and traffic. **That is three subsystems, not one
feature**, with different owners, timescales and success measures. Speccing them as a single unit
would produce a plan nobody can execute. Each gets its own phase below; **B1 should be specced in
full and built first**, because the other two are unmeasurable without it.

## Why B1 comes first

With zero leads and 49 sessions, nothing can currently be evaluated. Build capture improvements
first and you cannot tell if they worked. Buy traffic first and you cannot tell what it did. The
only defensible first move is to make the funnel legible, then change one thing at a time.

The foundation already exists and is better than it looks:

- `page_views` records `source`, `utm`, `referrer`, `country`, `device`, `session_id`.
- `inquiries` records `session_id` (populated by `persistInquiry` in the API routes).
- `getJourneys()` already reconstructs a session's path, and `/admin/inquiries` already renders a
  `JourneyStrip`.

**So every lead can already be joined to the traffic source that produced it.** The data is being
collected and is not being turned into an answer. That is the cheapest, highest-value work here.

## B1 — Make the funnel legible *(spec in full, build first)*

1. **Attribution on the lead.** At submit, resolve the session's *first-touch* source/UTM and store
   it on the inquiry, rather than re-deriving it later. First-touch, not last: the question is what
   brought them, and the referrer at submit time is usually the site itself.
2. **Funnel counts.** Sessions → reached a form → started a form → submitted, per source, per page.
   `form_start` is not currently tracked; the `events` table and `/api/events` already exist to carry
   it. Distinguishing "never saw the form" from "saw it and left" is the whole point.
3. **Lead status.** `inquiries.status` (`new / contacted / qualified / won / lost`) plus an owner and
   a note, surfaced in `/admin/inquiries`. Without it there is no way to know whether a lead was ever
   answered — and with the whole thing going to one shared mailbox today, that is a real risk.
4. **A dashboard sentence, not a chart wall:** "N leads this month, from these sources, M unanswered."

**Deliberately excluded:** lead scoring (needs history that does not exist), and CRM integration
(no CRM has been named — see open questions).

## B2 — Capture *(spec after B1 has data)*

Candidates, in rough order of effort-to-value: sharper and more consistent CTAs (`CtaBand` is absent
from `/careers`, `/contact` and `/blog`); a shorter first step on the discovery form; a lead magnet
worth an email address; and only then anything intrusive like exit-intent.

**Deliberately not specced yet.** Every one of these is a conversion-rate bet, and the conversion
rate is currently undefined. Speccing them now would be inventing numbers. Revisit once B1 has run
long enough to show where people drop.

## B3 — Traffic *(largely not a code project)*

The Search Console baseline is the finding that matters: **zero visibility for `outsourc*` queries**.
The site does not rank for what the business sells. Mostly content and SEO work — keyword targeting,
service-page depth, a content plan the blog can now carry — plus, on the code side, campaign landing
pages with UTM tracking (the plumbing already exists; 3 of 272 views carried a UTM).

**This is a marketing programme with an engineering assist, not an engineering project**, and it is
the slowest of the three to pay off. It should not block B1.

---

## Recommended sequence

1. **A1 — reveal safety net.** Fixes a live bug where visitors may see blank sections. Highest
   urgency: it costs real traffic today.
2. **A2 — clickable steppers**, with the accessibility fix that has to come with it.
3. **A3 — browser/viewport matrix**, verifying 1 and 2 across the matrix in one pass.
4. **B1 — funnel legibility.** Start the clock on measurement early; it needs elapsed time to be
   worth anything.
5. **B2 / B3** — once B1 has data.

## Open questions for the client

1. **"Click action on the numbers for all pages"** — confirm this means the two home-page steppers.
   The other numbers are decorative watermarks beside already-visible content.
2. **Is there a CRM?** (HubSpot, Zoho, Salesforce, a spreadsheet?) It changes B1's shape entirely —
   export target versus build-it-here.
3. **What counts as a qualified lead** for .ppl, and who owns follow-up? B1's status field is
   guesswork without this.
4. **Is there budget for paid traffic**, or is B3 organic-only? Changes the sequencing.
5. **iOS/Safari testing** — is a real device available, or should a cloud testing service be costed?

## Out of scope

- Rebuilding the animation system. A1 makes it fail safe; it does not replace it.
- Live chat / chatbot — not requested, and it needs staffing to be worth anything.
- Marketing email sending. Resend is configured transactional-only; bulk sending is a different
  deliverability problem.
- Multi-language, blog categories/tags, search — still deferred per `CLAUDE.md`.
