# Share Buttons and Rich Link Previews — Design

**Date:** 2026-08-01
**Backlog:** closes **F1** (share button on blog posts) and **F2** (share button on job postings), `PRE-LAUNCH-CHECKLIST.md` §11
**Branch:** `feat/post-sharing`, based on `master`

## Goal

A share row on blog posts and job postings, and a pasted link to either that renders as a card —
title, image, and snippet — the way a WordPress post does.

## The work splits into two independent halves

**Half 1 — the link preview.** Metadata only, no UI. Fixes previews for links shared *any* way,
including ones pasted by hand today.

**Half 2 — the share row.** The buttons themselves.

Neither depends on the other. Half 1 is the half that is currently broken.

## Current state (measured, not assumed)

Live tags on `/blog/why-the-philippines-for-bpo`:

```
og:title        present
og:description  present  (the excerpt)
og:type         present  article
og:image        MISSING
og:url          MISSING
twitter:card    "summary"   — small square thumbnail, not a wide banner
```

`generateMetadata` in `app/(site)/blog/[slug]/page.tsx` sets `openGraph.images` only when the post has
a `cover_image_url`. This post has none, so no image reaches a crawler. The *page* still looks right,
because the listing and header fall back to `ppl-blog-placeholder.png` — that fallback never reaches
the meta tags.

`app/(site)/careers/[slug]/page.tsx` is worse: `generateMetadata` returns only `title` and
`description`, with **no `openGraph` block at all**.

## Half 1 · Preview metadata

### Two new dynamic OG image routes

Both reuse `ogCard()` from `lib/og-card.tsx` **unchanged** — it already takes `{ eyebrow, title, photo }`
and renders the brand gradient card used by the five static page cards.

| New route | eyebrow | title | photo |
|---|---|---|---|
| `app/(site)/blog/[slug]/opengraph-image.tsx` | `Insights` | post title | `blog.jpg` |
| `app/(site)/careers/[slug]/opengraph-image.tsx` | `job.department`, else `Careers` | job title | `careers.jpg` |

Each route loads its record by slug from Supabase, the same way the page does. A missing record
falls through to the segment's existing static card rather than erroring.

Jobs have no cover-image column, so **every** job card is generated. Posts use their real cover when
one exists and a generated card otherwise.

### Metadata fixes

**Blog** (`app/(site)/blog/[slug]/page.tsx`) — add to the existing `openGraph` block:

- `url` — the canonical post URL
- `siteName`
- `publishedTime` — from `published_at`
- a `twitter` block with `card: "summary_large_image"`

`summary_large_image` is the single change that turns the small square thumbnail into the wide
banner the request describes.

**Careers** (`app/(site)/careers/[slug]/page.tsx`) — gains a full `openGraph` block plus the same
`twitter` block. Its description is built from `job.short_description` when present, falling back to
the current generic `"Apply for <title> at .ppl Solutions, Inc."`.

### The one behaviour to verify, not assume

When a post **does** have a `cover_image_url`, `generateMetadata` sets `openGraph.images` explicitly
while the file-convention `opengraph-image` route also exists for that segment. The metadata object
is expected to win, but Next has changed this precedence across versions, and a duplicated `og:image`
would leave crawlers picking the wrong one.

**The plan must check the emitted HTML for both cases — a post with a cover and a post without — and
assert exactly one `og:image`.** If the file route does append a second tag, the fallback moves out of
the file convention and into `generateMetadata`, which resolves the image itself.

## Half 2 · The share row

### `lib/share.ts` (new)

Pure functions building each share URL from `(url, title)`:

```
shareLinks(url, title) -> { linkedin, facebook, x }
```

All logic lives here because `vitest.config.ts` is `environment: "node"` with
`include: ["**/*.test.ts"]` — the suite cannot load `.tsx`. Keeping URL construction in a plain module
makes the testable part testable and leaves the component thin.

Targets:

- LinkedIn — `https://www.linkedin.com/sharing/share-offsite/?url=…`
- Facebook — `https://www.facebook.com/sharer/sharer.php?u=…`
- X — `https://twitter.com/intent/tweet?url=…&text=…`

Plain links. No SDK, no third-party script, therefore no new cookie and no change to the privacy
policy — the same constraint that shaped the first-party analytics.

### `components/ShareLinks.tsx` (new, client)

Props: `{ url: string; title: string }`. The `url` is **absolute and passed in from the server**, never
read from `window.location`, so it derives from `NEXT_PUBLIC_SITE_URL` and corrects itself when that
variable flips at cutover (checklist §1).

Four controls:

| Control | Behaviour | Tracking label |
|---|---|---|
| Copy link | Clipboard API, 2s "Copied!" swap | `share-copy` |
| LinkedIn | new tab, `rel="noopener noreferrer"` | `share-linkedin` |
| Facebook | new tab, `rel="noopener noreferrer"` | `share-facebook` |
| X | new tab, `rel="noopener noreferrer"` | `share-x` |

The confirmation renders in an `aria-live="polite"` region; icon-only controls carry `aria-label`.
`data-track-click` is read by the existing `InteractionTracker` via `closest()` — no analytics changes
needed.

Placement: bottom of `/blog/[slug]` and `/careers/[slug]`, after the content, before the back-link.

### One small extraction

`components/Footer.tsx` defines `LinkedInIcon` and `FacebookIcon` as private inline SVGs.
**Lucide has dropped its brand icons** — `Linkedin`, `Facebook` and `Twitter` are absent from the
installed `lucide-react`, verified directly — so `ShareLinks` cannot import them and must not
duplicate the footer's copies.

Move both into `components/icons/brand.tsx`, add `XIcon`, and have `Footer.tsx` import them. This is
the only refactor in scope; nothing else in `Footer.tsx` changes.

## Testing

- **Unit** (`lib/share.test.ts`): each target's URL shape, and encoding of titles containing `&`, `#`,
  `?`, and the em dashes the real copy uses.
- **Metadata**: assert the emitted tags in built HTML for a post with a cover, a post without, and a
  job — exactly one `og:image`, `og:url` present, `twitter:card` = `summary_large_image`.
- **OG routes**: fetch each `opengraph-image` URL directly — 200, `content-type: image/png`, 1200×630.
- **Gate**: `npm test`, `npx tsc --noEmit` (bare, never piped), `npm run build`.

## What cannot be verified before cutover

While `STAGING_PASSWORD` is set the site returns **401 to every crawler**, so Facebook, LinkedIn,
Slack and iMessage will show a bare link on both w2 and Vercel regardless of what is built. A real
preview cannot be demonstrated until the gate comes off.

Add to `PRE-LAUNCH-CHECKLIST.md` post-cutover verification: paste a live post URL and a live job URL
into LinkedIn, Facebook and Slack and confirm the card renders.

## Out of scope

Native mobile share sheet, WhatsApp, share counts, and anything requiring a third-party script — the
last would reintroduce the cookie-consent question the analytics design exists to avoid.
