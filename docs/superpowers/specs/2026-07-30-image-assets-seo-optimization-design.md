# Image Asset Replacement, SEO Metadata, and Size Optimization

**Date:** 2026-07-30
**Status:** Approved

## Goal

Replace the site's banner and section photography with 14 supplied `.webp` files, give
every content image accurate alt text, add per-page OG images, and cut `public/` from
~14.5 MB to under 1.5 MB.

## Starting state

`public/` holds 26 images totalling ~14.5 MB. Seven are photographs saved as PNG,
including `services/ppl-ecom.png` at 3.28 MB and `home/ppl-landing-header.png` at
1.75 MB. The supplied assets are 14 webp files at 1600×1067, 73–184 KB each, already
well compressed — the work is placement, naming, cropping, and metadata, not
recompression of the new files.

## Three constraints that shape the design

**1. Most banners must keep `alt=""`.**
`PageHero.tsx:22-30`, `Hero.tsx:13`, and `CtaBand.tsx:52` render their photo as an
`aria-hidden`, 40%-opacity background behind a gradient scrim. Empty alt is correct for
a decorative background; descriptive alt there would be an accessibility regression and
carries no SEO value. Alt-text effort goes to genuine content images instead.

**2. The new photos are all generic corporate/meeting shots.**
None depict healthcare, manufacturing, banking, telecommunications, or e-commerce. The
Industries strip (`lib/content.ts:196-224`) uses industry-specific photos with matching
alt text. Those six are retained and merely recompressed; substituting generic photos
would make both the visuals and the alt text less truthful.

**3. Supplied filenames are not web-ready.**
They carry spaces, a double space, and mid-word truncation
(`...working project  wor.webp`, `...Business Strate.webp`). All are renamed to
kebab-case slugs.

## Asset mapping

### Banners — decorative, `alt=""` retained, cropped to 1600×750

| Slot | Source photo | New path |
|---|---|---|
| `/` hero | Young Asian business people planning strategy | `home/ppl-hero-business-strategy-planning.webp` |
| `/about` | Boardroom meeting seen through doorway | `about/ppl-about-hero-boardroom-meeting.webp` |
| `/services` | Woman in headset, customer service | `services/ppl-services-hero-customer-service.webp` |
| `/careers` | Portrait of happy employees with lanyards | `careers/ppl-careers-hero-team-portrait.webp` |
| `/blog` | Team working in modern office, overhead | `blog/ppl-blog-hero-team-overhead.webp` |
| `/resources/how-to-get-started`, `/resources/faq` | Man presenting at a meeting | `resources/ppl-resources-hero-presentation.webp` |
| `/resources/referral` | Clenched fists showing support | `resources/ppl-referral-hero-fist-bump.webp` |
| `/contact` | Two colleagues reviewing documents | `contact/ppl-contact-hero-consultation.webp` |
| `CtaBand` | Hands stacked in a huddle | `home/ppl-cta-team-huddle.webp` |

`/resources/referral` currently reuses the how-to banner; giving it its own photo
removes that duplication.

### Content images — real alt text, cropped square or 3:2

| Slot | Source photo | New path | Alt text |
|---|---|---|---|
| 3E's Economical | Excited team celebrating with laptop | `home/ppl-3es-economical-celebration.webp` | An offshore team celebrating a project win around a laptop |
| 3E's Efficient & Effective | Team reviewing work at a monitor | `home/ppl-3es-efficient-team-review.webp` | Team members reviewing work together at a shared monitor |
| 3E's Evolving & Elevating | Young team celebrating at a whiteboard | `home/ppl-3es-evolving-whiteboard.webp` | Colleagues planning next steps at a whiteboard covered in notes |
| `AboutIntro` (×2) | Multicultural team with sticky notes | `about/ppl-about-team-project-planning.webp` | A multicultural .ppl Solutions team mapping out a client project |
| Blog card placeholder | Boardroom table from above | `blog/ppl-blog-placeholder-meeting.webp` | A .ppl Solutions team meeting viewed from above |

3E's images render inside a circular `object-cover` mask (`ThreeEs.tsx:35-43`), so they
are center-cropped to 600×600 squares biased toward faces.

### Retained, recompressed only

The six Industries photos (`ppl-bank`, `ppl-comms`, `ppl-ecom`, `ppl-health`, `ppl-it`,
`ppl-manufacture`) keep their existing alt text and convert to webp at 1600px wide.
`ppl-it` is also the `/privacy-policy` banner and keeps that role.

**Superseded later the same day.** The five leadership portraits were originally
re-encoded to 600×600 squares from mismatched sources (three were only 300×300, i.e.
below the 394 CSS px the largest fan slot renders at). The client then supplied properly
named 533×800 transparent webp cutouts, which are copied through untouched — see
"Leadership portraits" below.

`ppl-logo.png` stays PNG: 2.9 KB with alpha, already smaller than the churn is worth.

## Size pipeline

`scripts/optimize-images.mjs`, driven by a manifest so it is re-runnable and reviewable.
Uses sharp, already present transitively via Next.

| Class | Target | Notes |
|---|---|---|
| Banners | 1600×750 webp q80 | No upscaling; source is 1600 wide |
| 3E's circles | 600×600 webp q82 | Square center-crop |
| About content | 900×900 webp q82 | Renders at 432px, 2× for retina |
| Blog placeholder | 1200×800 webp q80 | |
| Industries | 1600w webp q80 | From 1920px originals |
| Leadership portraits | copied through, no re-encode | 533×800, alpha required |

Cropping banners to 2.13:1 from 3:2 originals trims roughly the top and bottom 15% of
each frame. Crops are biased toward faces rather than centred.

**Result: 14.5 MB → 1.5 MB of site images, plus ~300 KB of OG cards.**

## SEO work

Because banner alt stays empty, the real gains are elsewhere:

- **Per-page OG images.** Only a single global `app/opengraph-image.tsx` exists, so every
  page shares one link preview. Add `opengraph-image` for `/about`, `/services`,
  `/careers`, `/blog`, and `/contact` using each page's new photo.
- **Descriptive kebab-case filenames**, per the mapping above.
- **Organization JSON-LD carrying `logo` and `image` as `ImageObject`.** This was
  originally scoped as "add `ImageObject` to the existing JSON-LD" — but the codebase
  had no structured data at all, so `components/OrganizationSchema.tsx` introduces a
  minimal Organization block from the site layout. Scope stays on the image-SEO half
  (`logo`, `image`); a fuller schema suite is out of scope here.

## Knock-on fix: the pinned 3E's mask

`ThreeEsPinned.tsx` sized its photo with `object-contain` and no circular clip. That
worked only because the previous art was transparent PNG cutouts — a square container
was invisible around them. Full-bleed photos exposed the missing mask, rendering a
square image with the gradient comet ring floating on top. Fixed by adding
`overflow-hidden rounded-full` and switching to `object-cover`, matching the static
variant in `ThreeEs.tsx`. GSAP only animates `autoAlpha`, `scale`, and `filter` on
that element, so clipping it is safe.

`LeadershipShowcase.tsx` also uses `object-contain object-bottom` and still depends on
transparency — the headshot webp conversion preserves alpha, verified per file.

## Deletions

Removed with `git rm`, so everything stays recoverable from history.

`public/about/team-highfive.png` — confirmed zero references in `app/`, `components/`,
or `lib/`.

From `assets/`, 18 source files no longer feeding any output:

- Superseded banners: `ppl-about-header.png`, `ppl-contact.png`, `ppl-services.png`,
  `ppl-landing-header.png`, `ppl-test-header.png`, `ppl-blog.jpg`, `ppl-careers.jpg`,
  `ppl-office2.jpg`
- Superseded content: `ppl-bpo2.png`, `ppl-highfive.png`, `ppl-write.png`,
  `ppl-meet.png`, `ppl-laptop.png`
- Never wired anywhere: `ppl-back.jpg` (1.97 MB), `ppl-meeting.png`, `ppl-mornd.jpg`,
  `ppl-about-extra-img.png` (pre-composed purple block from the old site)
- Retired person: `ppl-belle.png` (Roschelle Del Rosario, replaced by Apol Macaroyo in
  the client's 07/24 round)

`ppl-belle.png` tracks a client decision rather than a code fact. It is recoverable from
git if that reverses.

Sources still required by the pipeline are kept: the 14 new webp files, the six
Industries photos, the five in-use headshots, and `ppl-logo.png`.

This frees roughly 15.4 MB from the repository.

## Verification — results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run build` | compiles; all 5 OG routes prerender static |
| Old image paths remaining in `app/`, `components/`, `lib/` | none |
| `public/` total | 1.8 MB, 31 files (was 14.5 MB, 26 files) — 1.5 MB of it the site images, ~300 KB the OG cards |
| All 10 public pages | HTTP 200 |
| Every new image URL | HTTP 200 |
| Images per page, transferred | `/` 137 KB (6 req), `/about` 138 KB (8 req), `/services` 203 KB (9 req) |
| Any single image over 100 KB | none |
| Empty `alt` outside `aria-hidden` | none, on `/` and `/services` |
| Headshot alpha after webp conversion | preserved on all 5 |
| Organization JSON-LD | renders and parses |

The `public/` count rises from 26 to 31 because of the five OG card backgrounds, which
are new files rather than replacements.

Note on the JSON-LD URLs: they derive from `site.url`, i.e. `NEXT_PUBLIC_SITE_URL`.
Locally they render as `localhost:3000`; production needs that env var pointing at the
real domain (it already defaults to `https://www.pplsolutionsinc.com`).

## Leadership portraits (follow-on, same day)

The client supplied five correctly named 533×800 transparent webp cutouts, replacing the
mismatched square headshots.

**Copied through, not re-encoded.** The largest fan slot renders at 394 CSS px
(`w-[22rem]` = 352 px × the centre slot's `scale(1.12)`), so 788 device px at DPR 2 —
533×800 is already right, and a second lossy webp pass would only add generation loss.
They arrive at 65–85 KB.

**They must stay 2:3 and keep alpha.** `LeadershipShowcase` renders them with
`object-contain object-bottom`; cropping them square or flattening them breaks the
cut-out fan.

Two files were renamed to match the supplied names: `apolpng.webp` → `apol-macaroyo.webp`
and `karen-porras.webp` → `clari-porras.webp` (the component displays "Clari Porras").
The earlier instruction to preserve the off-convention `apolpng` name no longer applies —
its whole purpose was that no properly named file existed.

**Alt text** moved from `Portrait of ${name}` to
`${name}, ${title}, .ppl Solutions, Inc.` — "portrait" describes the format, not the
content, and the old form produced five near-identical alts on one page.

**`sizes` corrected** from `304px` to `394px`, matching the real rendered box.

**Person structured data** (`components/about/LeadershipSchema.tsx`) is the "description"
half of the ask: each portrait is tied to a named person, job title, employer, and
verified LinkedIn profile, with the client-supplied first bio paragraph as `description`.
This is what `alt` cannot express. The roster moved to `lib/leadership.ts` so the
showcase and the schema share one source of truth and cannot drift.

### Cache gotcha found during verification

Three portraits kept their existing URLs, and Next served **stale optimized images** for
them — old 600×600 and 300×300 outputs — while the two renamed files were correct. The
optimizer cache in Next 16 lives at **`.next/dev/cache/images`**, not `.next/cache/images`.
Clearing the latter appears to succeed and changes nothing.

This matters for deployment: the CDN caches optimized images keyed by source URL, so
replacing a file's *contents* without changing its *name* can serve the old image until
the TTL expires. Renaming on content change avoids it.
