# Editable post/job dates + JobPosting structured data fixes

**Date:** 2026-08-06
**Status:** approved

## Why

Two things arrived together and turn out to be the same piece of work.

1. Posts and jobs both carry a timestamp, but neither is editable and jobs never show
   one publicly. An editor cannot backdate a post that was written last week, and a
   jobseeker cannot tell whether a role was posted in March or yesterday.
2. Google Search Console reported four non-critical `JobPosting` issues on
   `pplsolutionsinc.com` — one per open role: missing `streetAddress`, `postalCode`,
   `employmentType` and `baseSalary`.

Both are about the same thing: the dates and facts we hold are not reaching the
crawler in a form it can read.

## Current state

- `posts.published_at` exists. It is set automatically the first time a post goes
  live and **nulled when a post returns to draft**. Not exposed in `PostForm`.
- `jobs.created_at` feeds `datePosted` in `lib/jobSchema.ts` and is correct, but no
  date is rendered on `/careers` or a job detail page.
- The `<time>` elements on the blog listing and post page carry **no `dateTime`
  attribute**, so the rendered date is human-only.
- `lib/jobSchema.ts` deliberately omits street address and salary. The comment at
  `lib/jobSchema.ts:82` is the reasoning: a role need not sit at the registered
  office, and inventing one would be a false claim.
- All four open roles are `hybrid` with `location: "Pasig"`, so they all take the
  physical-address branch — which is why all four report the same two address
  warnings.
- The office address exists in exactly one place: hardcoded in the privacy policy
  page (`app/(site)/privacy-policy/page.tsx:227`).

## Design

### 1. Data model

`jobs` gains two nullable columns:

| Column | Type | Notes |
|---|---|---|
| `posted_at` | `timestamptz` | Editorial posted date. `null` falls back to `created_at`. |
| `employment_type` | `text` | CHECK against the schema.org vocabulary. |

`posted_at` is a new column rather than an editable `created_at` because
`created_at` is an audit field — it feeds the activity log and the admin ordering.
An editorial date and an audit timestamp answer different questions and should not
share storage.

`employment_type` is constrained to `FULL_TIME`, `PART_TIME`, `CONTRACTOR`,
`TEMPORARY`, `INTERN`, `VOLUNTEER`, `PER_DIEM`, `OTHER` — the values schema.org
accepts, stored verbatim so no mapping layer is needed. Existing rows are
backfilled to `FULL_TIME`.

> The CHECK constraint and the app-level allow-list are written together and the
> constraint is verified after applying, per the `events.type` trap of 2026-08-05
> where a value passed the app's allow-list, failed an unknown CHECK, and the
> failure was swallowed by a route that always returned 204.

`posts` needs **no schema change**. `published_at` is already an editorial field; it
is simply not exposed.

`lib/site.ts` gains `site.address`:

```ts
address: {
  street: "32F One San Miguel Building, San Miguel Ave. corner Shaw Boulevard",
  locality: "Pasig City",
  region: "Metro Manila",
  postalCode: "1605",
  country: "PH",
}
```

The privacy policy page imports it instead of hardcoding, giving the office address
one source of truth.

### 2. Admin editing

Both forms gain a `datetime-local` input, entered and displayed in **Manila time**.

Two new helpers in `lib/dates.ts`, mirroring the existing `manilaEndOfDay` /
`toDateInput` pair and following the same three-way return contract (blank → `null`,
malformed → `undefined`, valid → ISO string) so a caller can distinguish "cleared"
from "typo":

- `manilaDateTime(input: string): string | null | undefined`
- `toDateTimeInput(ts: string | null): string`

**PostForm — "Published on"**
- Blank + status `published` → set to now. This is today's behaviour, preserved.
- Filled → that instant wins. Posts can be backdated.
- **Behaviour change:** returning a post to draft no longer nulls `published_at`.
  Discarding a date an editor deliberately set is data loss, and republishing would
  silently stamp today. The "was this published before?" signal moves from
  `Boolean(existing.published_at)` to `existing.status === "published"`, which is
  the honest signal and is already what `published_by` tracks. Safe because every
  public query filters on `status`, never on `published_at`
  (`app/(site)/blog/[slug]/page.tsx:22,32`, `opengraph-image.tsx:20`).

**JobForm — "Posted on"**
- Blank → falls back to `created_at`. Placed beside the existing "Expires on" field.

**JobForm — "Employment type"**
- A select defaulting to Full-time on new jobs.

### 3. Public display

The visible text stays a plain date — "Posted August 6, 2026". A clock time on a job
ad or a blog post is noise for a human reader. The time lives in the
machine-readable `dateTime` attribute as a full ISO instant, which is the half that
does anything for search.

- `/careers` cards and the job detail meta row gain a "Posted <date>" item wrapped in
  `<time dateTime={iso}>`.
- The two existing blog `<time>` tags gain the missing `dateTime` attribute. No
  visual change.

### 4. JobPosting schema

`lib/jobSchema.ts` changes:

- `jobLocation.address` gains `streetAddress` and `postalCode` from `site.address`
  for on-site and hybrid roles. Fully remote (`wfh`) roles keep no physical address —
  that branch is already correct and must not gain one.
- `employmentType` emitted when set, omitted when null.
- `datePosted` becomes `posted_at ?? created_at`.
- The file header comment is updated: it currently justifies omitting the street
  address, which stops being true.

`baseSalary` stays omitted. Publishing pay is the client's decision and a wrong
`baseSalary` is a claim made on their behalf to every jobseeker who sees the
listing. That warning will persist in Search Console; Google classes it
non-critical and it does not block the listing.

### 5. Testing

Extends the existing suite (280 tests at time of writing):

- `lib/dates.test.ts` — Manila datetime round-trip, including an instant that falls
  on a different UTC day than its Manila day; blank vs malformed input.
- `lib/jobSchema.test.ts` — street/postcode present for on-site and hybrid, absent
  for remote; `employmentType` emitted when set and absent when null;
  `posted_at` overriding `created_at` for `datePosted`, and `created_at` used when
  `posted_at` is null.

Then `npm test`, `tsc --noEmit`, `npm run build`, and after deploy a Rich Results
check against a live job URL to confirm Google reads the new fields.

## Explicitly out of scope

- **`BlogPosting` / `Article` JSON-LD for posts.** Posts currently have no structured
  data of any kind, so Google cannot read a post's date however editable it becomes.
  This is the highest-value remaining visibility item and was raised twice; the owner
  chose not to include it in this piece of work. Roughly one new file
  (`lib/postSchema.ts`) reusing the pattern `jobSchema.ts` establishes.
- **`baseSalary`.** Needs client figures and a client decision, not a schema change.
- **`applications` RLS.** Noticed while checking grants: `applications` has only a
  SELECT policy and no UPDATE policy — the same shape that silently discarded every
  lead-status save on `inquiries`. It will bite the retention/blacklist feature. Not
  touched here.

## Risks

- All four open roles expire 17–24 August. If they lapse before Google recrawls,
  the warnings clear because the postings disappear, not because they were fixed.
  The Rich Results check on a live URL is what actually confirms the fix.
- `site.address` asserts that on-site and hybrid roles are at the registered office.
  True for all current roles (all Pasig). If a role is ever staffed elsewhere, the
  schema would misstate it — at which point the right move is a per-job address
  field, considered and set aside here as unnecessary today.
