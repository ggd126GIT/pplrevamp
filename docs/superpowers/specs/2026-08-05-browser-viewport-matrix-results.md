# Browser & Viewport Matrix — Results (A3)

**Date:** 2026-08-05
**Against:** `f3a7ba5` (live), plus the `/contact` fix made in response to what this found
**Spec:** `2026-08-05-client-todo-and-lead-generation-design.md` §A3

"Works on any browser" cannot be *proven*. What follows is what was tested, what was found, and —
just as importantly — what was **not** covered.

## Method, and why it is not the obvious one

`resize_window` reports success but never resizes the window (`outerWidth` stays `0`), so the direct
approach was unavailable. Instead each page was loaded in a **same-origin iframe** sized to the target
viewport. An iframe has its own viewport for media-query purposes, so `@media (min-width: 1024px)`
and `gsap.matchMedia` evaluate for real rather than being simulated.

**Horizontal overflow was measured twice.** `body` carries `overflow-x: hidden`, which *hides*
sideways overflow rather than preventing it — so `scrollWidth === clientWidth` proves nothing on its
own. Every measurement was repeated with the clip forced to `visible`, and elements sitting inside a
deliberately-clipping ancestor (the marquee) were excluded so they did not register as false
positives.

## Coverage

| | Covered |
|---|---|
| Browser | **Chrome only** (139, Windows 11, DPR 1.25) |
| Viewports (home) | 320×568, 375×667, 768×1024, 1024×768, **1280×720**, 1440×900, 1920×1080 |
| Viewports (all 10 pages) | 320×568 and 1280×720 |
| Pages | `/`, `/about`, `/services`, `/careers`, `/contact`, `/blog`, `/resources/faq`, `/resources/how-to-get-started`, `/resources/referral`, `/privacy-policy` |
| Checks | true horizontal overflow, the 1024px animated/static boundary, stepper presence, reveal-floor (`.reveal` still hidden after 2s) |

## Findings

### 1. `/contact` pushed the page sideways on a narrow phone — FIXED

The only real defect found, and it was on the page where it costs the most.

| Viewport | Overflow before | After |
|---|---|---|
| 320px | **65px** | 0 |
| 360px | 25px | 0 |
| 375px | 10px | 0 |
| 390px+ | 0 | 0 |

**Cause:** the contact/consultation tab row was `inline-flex`, so "Schedule a consultation" set its
min-content width to ~385px. Grid items default to `min-width: auto` and refuse to shrink below
content, so that one row stretched the entire column — which is why the *aside* overflowed by exactly
the same amount at each width. One cause, two symptoms.

**Fix:** the row is full-width and shrinkable below `sm` (`flex w-full` + `flex-1` buttons, reverting
to `sm:inline-flex`), plus `min-w-0` on both grid children so a stubborn child can never again push
the page wide. Re-measured: 0 overflow at 320/360/375/414, and all 10 pages clean at 320.

### 2. Everything else was clean

- **No horizontal overflow** on any of the 10 pages at 320px or 1280×720, verified with the
  `overflow-x: hidden` clip removed.
- **The 1024px boundary is exact.** Below it the static grid renders and the animated stage is
  `display: none`; at 1024 and above they swap. The CSS media query and `gsap.matchMedia` agree, so
  the visible layout always matches whether the scroll animation is wired up.
- **1280×720 — the short-viewport case the spec called out as worst for a pinned full-height
  section — showed no overflow and no trapped scroll.** Worth noting the whole session ran at a
  730px-high viewport, so the pinned sections have had sustained exercise at that height.
- **The A1 reveal floor holds at every viewport:** zero `.reveal` elements still hidden after the 2s
  timeout, at all seven sizes.
- The stepper buttons exist in the DOM at all widths but sit inside a `display: none` stage below
  1024px, so they are correctly unreachable — no keyboard trap on mobile.

## NOT covered — read this before telling the client "it works everywhere"

- **Firefox, Safari (macOS), Safari (iOS), Edge: entirely untested.** Only Chrome is available here.
  This is the single biggest gap and it is not closeable with the current tooling.
- **iOS Safari's `100vh` behaviour** — the toolbar changes the viewport mid-scroll, which is the
  classic way a pinned full-height section misbehaves. Needs a real device or a paid cloud service
  (BrowserStack/Sauce); worth costing rather than quietly skipping.
- **Touch interaction** — the stepper was verified with a mouse. Tap targets are 44px (`size-11`),
  which meets the WCAG minimum, but no tap was actually performed.
- **Orientation change** on tablets/phones, and resizing *across* the 1024px boundary in a live
  session — `gsap.matchMedia` should handle it, but it was not exercised.
- **An iframe is not a window.** No browser chrome, no dynamic toolbar, no touch, DPR fixed at 1.25.
  It is a faithful test of layout and media queries, and not of anything else.
- **Print styles** and high-contrast/forced-colours modes.

## Recommended next step

Ask the client which browsers their prospects actually use — the analytics already records `device`
and could record browser. Testing what visitors use beats testing an abstract matrix, and with 49
sessions so far the real answer may be narrow.

---

# Re-run against `9c18f8e` (2026-08-05, after the /services rewrite)

`/services` changed three times after the original run — pinned sequence replaced by a carousel, the
visible label removed, the arrows moved beside the circle — and the old mobile 6-up grid no longer
exists. The results above no longer described what was live, so the matrix was re-run on production.

## Method correction: `scrollWidth` over-reports

The original run measured horizontal overflow as `scrollWidth - clientWidth`. **That metric produced
a false positive**, and it is worth recording because it nearly cost a wasted fix.

On live `/contact` at 320px it reported **40px of overflow**. But with the clip removed, *no element
extended past `clientWidth`*, and `window.scrollTo(9999, 0)` left `scrollX` at **0** — the page could
not be scrolled sideways at all. That is the signature of a decorative element overhanging the
**left** edge: it inflates `scrollWidth` while never being reachable in an LTR document.

**The authoritative test is whether the page can actually be scrolled sideways** — unmask the clip,
attempt to scroll, and read `scrollX`. `scrollWidth` is a proxy that reports layout facts a visitor
never experiences. All figures below use the scroll test.

## Results — everything clean

**Horizontal scroll: `scrollX = 0` on all 10 pages at 320×568, and on `/`, `/services`, `/blog`,
`/contact` at 1280×720.** Clip removed for every measurement.

**Reveal floor: 0 stranded `.reveal` elements** on every page at every viewport, measured after the
2s timeout — the A1 safety net still holds after the `/services` rewrite removed its
`.svc-reveal-*` entries.

**`/services` specifically**, at 320×568 / 375×667 / 768×1024 / 1024×768 / 1280×720 / 1440×900 /
1920×1080: no sideways scroll at any size.

**The carousel**, measured at 5 viewports:

| Viewport | Ring | Arrow tap target | Clearance to ring glyphs | Dots | Steps? |
|---|---|---|---|---|---|
| 320×568 | 169px | 44×44 | 11px | 6 | yes |
| 375×667 | 224px | 44×44 | 14px | 6 | yes |
| 768×1024 | 432px | 44×44 | 31px | 6 | yes |
| 1280×720 | 432px | 44×44 | 31px | 6 | yes |
| 1920×1080 | 432px | 44×44 | 31px | 6 | yes |

Clearance is measured to the **glyph ring** (radius 165 + font in a 400 viewBox), not to the SVG's
bounding box — the box rotates, so its axis-aligned rect grows as it spins and reports overlap where
there is clearance.

⚠ **The 44px tap target is preserved at every size, but it costs the circle.** Two arrows take ~100px
of width, so at 320px the ring is 169px (photo ~128px). Acceptable, and a deliberate trade — if it
ever reads as too small on a phone, the fix is arrows below the circle under `sm`, which is now safe
because the ring no longer spills outside its layout box.

## Still not covered

Unchanged from the original run, and still the biggest gap: **Firefox, Safari (macOS and iOS) and
Edge are entirely untested** — Chrome is the only browser available. iOS Safari's `100vh` behaviour
needs a real device or a paid service. No touch taps, no orientation change, no print styles.
