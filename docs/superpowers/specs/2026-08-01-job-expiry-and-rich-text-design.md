# Job expiry dates and rich-text job descriptions

**Date:** 2026-08-01
**Branch:** `feat/job-expiry` (based on `master`)
**Implements:** `PRE-LAUNCH-CHECKLIST.md` §11 **F4** (job expiry). Unblocks **F6**, which depends on F4 existing.

---

## 1. Problem

Two gaps in the jobs admin:

1. **No expiry.** A role stays on `/careers` until someone remembers to close it by hand. The owner
   asked for an expiry date that auto-hides the posting once it passes.
2. **No formatting.** `JobForm` edits the description through a plain `<textarea>` whose text is
   converted to Tiptap JSON by `textToDoc`. Staff cannot bold, underline, or italicise anything.
   The blog editor has had a full Tiptap toolbar (`components/admin/RichTextEditor.tsx`) since it
   shipped; jobs are the one place still on the textarea.

## 2. Current state (verified 2026-08-01)

- `jobs` holds **3 rows** — `marketing-associate` (closed), `email-and-social-media-campaign-lead`
  (open), `project-manager` (open). The checklist's "there are zero jobs" note is out of date; these
  were created 2026-07-31 after it was written.
- All three descriptions are **clean structured Tiptap JSON** — paragraphs and `bulletList`s, two
  real `hardBreak` nodes, **zero text nodes containing embedded newlines**, zero marks. They load
  into Tiptap losslessly. **No data migration is required.**
- Public reads use `createPublicClient` (anon key) in three places: `/careers`, `/careers/[slug]`
  (both `getJob` and `generateStaticParams`), and `app/sitemap.ts`.
- The public RLS policy on `jobs` is `status = 'open'`.
- `/api/apply` accepts a `jobId` and never validates it against the `jobs` table at all.

## 3. Decisions

**Expiry is derived, never written back.** `expires_at` plus a query filter is the whole mechanism.
`status` is not flipped to `'closed'` when the date passes — a cron that rewrites `status` can only
drift from `expires_at`, and it would make this project's first scheduled job for no gain. Keeping
expiry derived also means *extending* a date instantly un-hides the role with no second write.

**Expiry is not shown to candidates.** The owner framed F4 as housekeeping, not as a published
deadline. Staff who use it to tidy stale listings will extend dates casually, and a public
"Applications close 15 August" that keeps moving is a promise being broken. It is one line of JSX to
add later if they decide it is a real deadline.

**Do not delete on expiry.** Per F4: hide the row so the job and its applications survive.

## 4. Design

### 4.1 Schema

```sql
alter table public.jobs add column expires_at timestamptz;
create index jobs_public_read_idx on public.jobs (status, expires_at);

drop policy "jobs public read open" on public.jobs;
create policy "jobs public read open" on public.jobs for select to public
  using (status = 'open' and (expires_at is null or expires_at > now()));
```

Applied through `mcp__supabase__apply_migration` (this project keeps no local `supabase/migrations`
directory). `lib/database.types.ts` then gets `expires_at` added by hand to the `jobs` Row / Insert /
Update blocks — a full regen churns unrelated tables and generator metadata, burying a three-line
change in review noise.

Enforcing expiry **in the RLS policy** rather than only in queries means an expired job is invisible
to the anon key even if an app query forgets the filter. All three public read paths use the anon
key, so `sitemap.ts` and `generateStaticParams` are covered by construction. The explicit filters in
§4.2 are kept as documentation of intent, not as the only defence.

### 4.2 Public read paths

Each of the three queries gains:

```ts
.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
```

`getJob` uses `.single()`, so an expired slug returns null and the page calls `notFound()` — an
expired detail URL 404s rather than rendering.

**ISR interaction:** all careers pages are `export const revalidate = 60`, so a job can linger up to
60 seconds past its expiry and each URL caches independently. That is acceptable and is the reason
`revalidate` must stay short — a long window would make expiry look broken.

### 4.3 Date handling — `lib/dates.ts` (new)

The field is a **date**, not a timestamp. `2026-08-15` means "the last day we accept applications",
stored as `2026-08-15T23:59:59.999+08:00`.

The Philippines is UTC+8 and has never observed DST, so a hardcoded `+08:00` offset is exact and
needs no timezone library.

```ts
/**
 * "2026-08-15" -> "2026-08-15T15:59:59.999Z".
 * null when the input is blank (cleared), undefined when it is malformed (typo).
 */
export function manilaEndOfDay(input: string): string | null | undefined;

/**
 * A stored timestamptz -> the "yyyy-mm-dd" an <input type="date"> expects, in
 * Manila time. Empty string when the column is null.
 */
export function toDateInput(ts: string | null | undefined): string;
```

`manilaEndOfDay` returns `undefined` (distinct from `null`) for a **malformed** date so the caller
can tell "cleared" from "typo" — see §4.4.

### 4.4 Admin form and actions

- `JobForm` gains an **Expires on** field in the existing two-column grid:
  `<TextInput type="date" name="expires_at" defaultValue={values.expires_at} />`. The `TextInput`
  primitive already spreads arbitrary input props, so no new primitive is needed.
  Hint text: *"Leave blank for no expiry. The role hides from /careers at the end of this day
  (Manila time)."*
- `parse()` in `app/admin/jobs/actions.ts` converts the input. A malformed date returns
  `{ error: "Enter a valid expiry date." }` rather than silently storing null and losing the intent.
- `app/admin/jobs/[id]/page.tsx` passes `expires_at: toDateInput(job.expires_at)`.
- `app/admin/jobs/page.tsx` renders an **Expired** badge beside the status pill when the date has
  passed, and the date in the meta line. Without it, a job vanishing from `/careers` while its admin
  row still reads "open" looks like a bug.

### 4.5 Rich-text editing

- `RichTextEditor` gains an **Underline** toolbar button. Verified 2026-08-01: StarterKit 3.28's
  default extension list is `bold, blockquote, bulletList, code, codeBlock, doc, dropCursor,
  gapCursor, hardBreak, heading, undoRedo, horizontalRule, italic, listItem, listKeymap, link,
  orderedList, paragraph, strike, text, underline, trailingNode` — **`underline` and `strike` are
  both already registered**, so no new dependency and no `configure` change.
- `renderTiptap` in `lib/tiptap.ts` gains `underline → <u>` and `strike → <s>`. Strike is not on the
  toolbar, but StarterKit registers it and a paste can carry it; without the case it renders as
  unmarked text, losing the author's meaning silently.
- `JobForm` replaces the description `Textarea` with `RichTextEditor` plus a hidden JSON input,
  mirroring `PostForm` exactly (`useState` seeded from `values.description`, hidden input carrying
  `JSON.stringify(content)`).
- `parse()` in the jobs action switches from `textToDoc(...)` to a guarded `JSON.parse` of the
  hidden field, falling back to an empty doc on parse failure.

**Removed as dead code:** `textToDoc` and `docToText` (jobs were their only callers) and their tests
in `lib/tiptap.test.ts`. `renderTiptap` and its tests stay, including the legacy
`\n → <br/>` handling inside `renderText`, which still serves any older row.

**Known behaviour change:** `textToDoc` was what turned pasted plain text with `•` glyphs into real
bullet lists (commit `fe1df94`). Pasting from Word or Google Docs carries HTML, which Tiptap converts
to proper lists, and typing `- ` starts a list via input rules — but pasting *plain* text with bullet
glyphs will now leave them as literal characters in a paragraph. This is a real regression for one
paste path and is accepted: the toolbar makes it recoverable in a click, and Word paste (the client's
actual workflow) improves rather than degrades.

### 4.6 Application guard

`/api/apply` gains a job lookup after field validation and **before** the CV upload, so a rejected
submission never leaves a file in the private bucket:

- `jobId` empty → allowed unchanged; that is the general-application path.
- `jobId` present but missing, `status = 'closed'`, or past `expires_at` → `400` with
  *"This role is no longer accepting applications."*
- A malformed uuid makes the query error; treat any query error as a rejection.

The route uses the **service** client, which bypasses RLS, so this check is the only thing enforcing
expiry on that path — §4.1's policy does not cover it.

**Merge note:** this branch is based on `master`, which does not yet contain `feat/turnstile`'s
verification block in the same route. Both changes land immediately before the upload, so expect a
small textual conflict when Turnstile merges. Resolution: Turnstile check first, then the job guard —
or either order; they are independent.

## 5. Testing

**Unit (vitest):**

- `lib/dates.test.ts` — `manilaEndOfDay("2026-08-15")` is exactly `2026-08-15T15:59:59.999Z`;
  blank input → `null`; `"garbage"` and `"2026-13-40"` → `undefined`; `toDateInput` round-trips a
  stored instant back to the same calendar date, including one late-evening Manila timestamp that
  falls on the *previous* UTC day.
- `lib/tiptap.test.ts` — underline renders `<u>`, strike renders `<s>`, marks nest correctly with
  bold; delete the `textToDoc` / `docToText` suites.

**Manual, against a job with yesterday's date:**

1. Absent from `/careers`.
2. `/careers/<slug>` returns 404.
3. `/admin/jobs` shows the **Expired** badge.
4. A direct `POST /api/apply` with that `jobId` returns 400 and leaves **no file** in the `cvs`
   bucket.
5. Clearing the date in the admin form restores the job to `/careers` within the ISR window.

**Verification discipline** (per `verification-false-positives`): load each public URL **twice** —
ISR serves stale then regenerates — and remember the VPS and Vercel hold separate caches.

## 6. Out of scope

- **F6** (CV retention = expiry × 2). Depends on this, but F5/F6 conflict and the rule must be
  settled with the owner first.
- Showing the closing date to candidates (§3).
- Any scheduled/cron job.
