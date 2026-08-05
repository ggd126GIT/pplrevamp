# Blog Listing Pagination — Design

**Date:** 2026-08-05
**Branch:** `master` (small, self-contained; no feature branch)
**Prompted by:** the owner asking how many posts `/blog` shows before it paginates. Answer: all of
them.

## Goal

Paginate the public `/blog` listing at **9 posts per page**, without giving up the static
prerendering the rest of the site depends on.

## Current state (measured, not assumed)

`app/(site)/blog/page.tsx` selects every published post with **no `.range()` and no `.limit()`** and
maps the lot into a 3-column grid. There are 6 published posts today, so nothing is visibly wrong
yet.

Pagination already exists in this repo but **only in the admin**: `lib/pagination.ts`
(`ADMIN_PAGE_SIZE = 15`, `parsePage`, `pageRange`, `pageCount`) plus
`components/admin/Pagination.tsx`, used by `/admin/posts`, `/admin/jobs`, `/admin/applications`,
`/admin/inquiries`, `/admin/activity`. Nothing public imports any of it.

The practical ceiling on the current query is PostgREST's default 1,000-row cap, but the page becomes
unpleasant long before that — every card's cover image is in the initial payload.

## Decision: path segments, not a query param

`/blog/page/2`, chosen over `/blog?page=2`.

Reading `searchParams` in a server component **opts the route out of static generation**. `/blog` is
the most-linked page on the blog and is prerendered today; making it render per-request is a real
regression on a 1-vCPU box, and this is a site where SEO is under active work (see
`[[seo-traffic-baseline]]` — zero visibility for `outsourc*` queries). Path segments keep every page
`generateStaticParams`-prerendered with `revalidate = 60`, exactly as `/blog` behaves now, and give
each page a clean distinct canonical URL. It is also what WordPress used, which is where this site
came from.

The cost is one extra route file and a shared listing component. Accepted.

## Components

| Unit | Responsibility |
|---|---|
| `lib/pagination.ts` | Add `BLOG_PAGE_SIZE = 9` and `parsePageSegment(raw)`. `pageRange`/`pageCount` already take a size argument and are reused unchanged. |
| `lib/blogPosts.ts` | `fetchPostsPage(page)` → `{ posts, pageCount }`. Single source of the query so the two routes cannot drift. |
| `components/BlogList.tsx` | The card grid, lifted out of the current page unchanged. No visual change. |
| `components/BlogPagination.tsx` | Prev / "Page N of M" / Next, in the site's visual language. |
| `app/(site)/blog/page.tsx` | Page 1. Keeps `PageHero`, keeps the empty state. |
| `app/(site)/blog/page/[page]/page.tsx` | Pages 2+. |

### Why `parsePageSegment` and not the existing `parsePage`

`parsePage` coerces anything unparseable to page 1. That is correct for a query param — `?page=junk`
should not 404 a page the user reached by clicking. It is wrong for a **path segment**:
`/blog/page/abc` is a URL that does not exist and must 404, not silently serve page 1. So
`parsePageSegment` returns `number | null`, null for anything that is not a clean integer ≥ 1
(rejects `abc`, `1.5`, `-2`, `0`, `01`, `1e3`, empty).

### Why a second Pagination component

`components/admin/Pagination.tsx` hardcodes `?page=` href construction and admin styling (plain white
/ black borders). Teaching it both URL schemes *and* both visual languages would leave it worse than
two focused components. The public one is purple and rounded to match the cards.

No numbered page links — Prev/Next plus a counter. YAGNI at 6 posts.

## Behaviour

- `/blog` → posts 1–9, `revalidate = 60`, static.
- `/blog/page/2` → posts 10–18, and so on. `generateStaticParams` emits 2…N.
- `/blog/page/1` → `redirect("/blog")`, so page 1 never has two indexable URLs.
- Page out of range, or an unparseable segment → `notFound()`.
- Canonical is each page's own URL. Title is "Blog" on page 1, "Blog — Page N" after.
- The "Our first posts are on the way" empty state stays on `/blog` only; on pages 2+ an empty result
  is a 404, not an empty state.

## Trap: the `page` segment sits next to `[slug]`

`app/(site)/blog/page/` is a literal segment neighbouring the existing `app/(site)/blog/[slug]/`.
Static segments win in Next's router, so `/blog/page/2` resolves to the paged route rather than to a
post with slug `page`. The consequence: **a post can never again have the slug `page`** — it would be
shadowed and unreachable. None of the 6 existing slugs are affected. Noted rather than guarded; a
slug collision guard is not worth its weight for one reserved word.

`/blog/page` with no number falls through to `blog/[slug]` with `slug="page"`, finds no post, and
404s. Acceptable.

## Testing

`lib/pagination.test.ts` is **new** — the file does not exist today, so the existing helpers pick up
their first coverage alongside the new parser:

- `parsePageSegment` accepts `"1"`, `"2"`, `"10"`; rejects `"abc"`, `"1.5"`, `"-2"`, `"0"`, `"01"`,
  `"1e3"`, `""`.
- `pageRange(page, BLOG_PAGE_SIZE)` → page 1 = `[0, 8]`, page 2 = `[9, 17]`.
- `pageCount(n, BLOG_PAGE_SIZE)` → 0→1, 9→1, 10→2, 18→2, 19→3.

**Unit tests cannot prove the route works**, because with 6 published posts pagination renders
nothing at all. So: verify the real `/blog/page/2` route locally with `BLOG_PAGE_SIZE` temporarily
dropped to 2, exercising prev/next, the page-1 redirect, and the out-of-range 404 — then revert
before committing. Stated here so the temporary edit is not mistaken for the intended value.

## Out of scope

- Paged URLs in `sitemap.ts` — every post URL is already listed individually, so paged entries buy
  nothing.
- `noindex` on paged pages — indexable is standard and correct.
- Pagination for `/careers`, which has the same unbounded query but only 4 jobs.
- Categories, tags, or search (deferred post-launch in `CLAUDE.md`).
