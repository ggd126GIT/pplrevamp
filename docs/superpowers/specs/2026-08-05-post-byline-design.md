# Post Byline — Design

**Date:** 2026-08-05
**Branch:** `master` (small, self-contained)
**Prompted by:** the owner, after the excerpt line-break fix (`3ffbc15`) exposed *why* the byline was
mangled — editors had nowhere to put it, so they typed it into the excerpt.

## Goal

An **Author** field on the blog post form, so the excerpt contains only the excerpt.

## Current state (measured, not assumed)

`posts.author_id` exists and is populated, but it means **who created the row** — for most posts that
is the `admin@ppl.com` developer account, not the writer (see
`2026-07-29-staff-attribution-design.md`). It is an audit column and cannot serve as a public credit.

With nowhere else to put it, editors typed the byline into the excerpt. **Two** of the six published
posts carry it:

| slug | excerpt begins |
|---|---|
| `the-power-of-intentional-listening-…` | `By Tina Loneza\r\nDiscover how a shift…` |
| `from-uncertainty-to-empowerment-…` | `By Tina Loneza\r\n\r\nLooking back, my…` |

The other four (the Customer Success / BPO set) record no author anywhere. Their writer is **not
inferable from the data** and will not be guessed — they stay null until someone who knows fills them
in.

## Schema

```sql
alter table posts add column byline text;
```

**Named `byline`, not `author_name`.** `author_id` already exists meaning "creator". Two columns both
reading as "author" but meaning different things is how someone later renders the wrong one. `byline`
is unambiguous: the display credit. The admin form still *labels* it "Author", which is what an
editor is thinking.

Nullable, no default. The four unattributed posts stay null and render no byline — identical to
today. RLS needs no change: the public select policy is row-level, so a new column is covered.

## Components

| Unit | Change |
|---|---|
| `components/admin/PostForm.tsx` | "Author" `TextInput`, own row under Slug/Status. |
| `app/admin/posts/actions.ts` | `parse()` reads `byline`; trimmed, empty → null (same shape as `excerpt`). |
| `app/admin/posts/[id]/page.tsx` | Pass `byline` into `values` so editing round-trips. |
| `lib/database.types.ts` | Regenerated from the live schema. |
| `lib/blogPosts.ts` | `byline` added to the card select + `PostCard`. |
| `components/BlogList.tsx` | Byline line between title and excerpt. |
| `app/(site)/blog/[slug]/page.tsx` | `AUGUST 4, 2026 · Tina Loneza` on the existing date line. |

Both public renders are conditional on a non-null byline, so unattributed posts are untouched.

## Backfill

In the same migration, so schema and data land together:

```sql
update posts
set byline  = 'Tina Loneza',
    excerpt = regexp_replace(excerpt, '^By Tina Loneza\r?\n\s*', '')
where excerpt like 'By Tina Loneza%';
```

Anchored (`^`) and idempotent — re-running matches nothing because the prefix is gone. Affected rows
are read back with a `select` before and after; a bare row count is not evidence the text is right.

**Side effect, in our favour:** the OG/`<meta name="description">` for those two posts currently reads
"By Tina Loneza Looking back…" because `previewDescription()` collapses whitespace onto one line
(flagged when the line-break fix shipped). Once the byline leaves the excerpt, that fixes itself. No
extra work.

## Testing

A nullable display string has no parsing logic worth a unit test, and inventing one would be
theatre. Verification is:

1. Migration applied; the two rows read back — `byline` set, excerpt no longer starts with "By".
2. `tsc --noEmit` and the full suite (249) still green.
3. Locally: the two Tina posts show the byline on card and post page; the other four render
   byte-identically to before.
4. Admin round-trip: set an author on a post, save, confirm it persists and appears publicly.

## Out of scope

- Linking a byline to an author bio page.
- Multiple authors per post.
- A byline on `/careers`.
- Backfilling the four unattributed posts — needs a human who knows who wrote them.
