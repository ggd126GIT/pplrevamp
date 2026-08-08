# CSV export for job applications — design

**Date:** 2026-08-08 · **Status:** built and verified locally

## Problem

`/admin/applications` is the only place applicant data can be read, one page of
fifteen at a time. The admin needs the data outside the panel — primarily to
feed another system, secondarily to hand a shortlist to someone without a login.

## Decisions

| Question | Answer | Why |
|---|---|---|
| Format | **CSV** | Imports natively into HubSpot, any ATS, Sheets and Excel. XLSX would need a spreadsheet library added to an 11-package dependency list. |
| Scope | **Every row matching the current filter** | Pagination is a display concern. An export silently returning 15 of 60 rows is a dangerous bug, not a feature. |
| Filter | **Inherited from the page** | Export what you are looking at. Filters live in the URL, so the export gets them for free. |
| CV files | **7-day signed links, one column** | Owner's choice. Makes the file useful to an external system; also makes the file sensitive, which the activity log records. |
| Internal fields | **Excluded** | Status notes are candid remarks about named individuals. The file is designed to be forwarded; those should not travel with it. |
| Audit | **One `exported` activity entry** | Personal data leaving the system is exactly what an append-only log is for, and this site carries a real DPA-2012 statement. |

Columns: `First name, Last name, Email, Phone, Role, Applied, Status, CV link`.

## Architecture

**`lib/applicationsExport.ts`** — pure. Owns the file's *shape*: cell escaping,
formula neutralisation, header order, filename. Testable without a database.

**`app/admin/applications/export/route.ts`** — a GET route handler. Owns the
*data*: auth, query, CV signing, activity log, response headers.

**`lib/applicationFilter.ts`** — gains `exportHref(status)`, beside the existing
`filterHref`, so both links are built by the same tested module.

A GET route rather than a server action: the button is a plain `<a>`, the
browser handles the download natively, and the URL is shareable and repeatable.
A download over POST is none of those things.

## Three things that are easy to get wrong

**1. Spreadsheet formula injection.** Every name, email and phone in this file
was typed by an anonymous member of the public into the careers form. A value
beginning `=` or `@` executes when the CSV is opened in Excel or Sheets.
Neutralised with a leading apostrophe.

`+` and `-` are guarded **only when not followed by a digit**: `+639171234567`
is a phone number and must survive untouched, while `+cmd|…` is an attack.
Guarding both unconditionally would put a visible apostrophe in front of every
international phone number in the file.

**2. Excel and non-ASCII names.** Without a UTF-8 BOM Excel reads the file as
the system codepage and mangles any accented name — the same class of bug as the
header mojibake fixed earlier on this project. The file leads with a BOM and
uses CRLF line endings.

**3. Signing CVs one at a time.** The page signs individually because it only
ever shows fifteen; an export of several hundred would make several hundred
round trips. The route uses the batched `createSignedUrls`. The page is left
alone — it is correct for what it does.

## Failure handling

- **Not signed in** → the proxy 307s to `/login`; the route also returns 401 on
  its own. This endpoint emits every applicant's contact details in one
  response, so it does not rely solely on a middleware matcher.
- **Query fails** → 500, nothing logged. A failed export is not an export.
- **CV signing fails** → the CSV is still returned with empty CV links. The
  contact details are the part that cannot be reconstructed elsewhere.
- **Unrecognised `?status=`** → no filter, matching `parseStatusFilter`'s
  existing contract. An empty table is indistinguishable from "there are no
  applications", which is the wrong thing to tell someone.
- **No applications at all** → the button is hidden, so it can never hand back a
  header-only file.
- `MAX_ROWS = 5000` ceiling. Not a page size — it will not be reached at a few
  hundred applications a year, but an unbounded query over personal data only
  becomes a problem once.

## Database change

`activity_action_check` widened to allow `exported`. Applied directly to the
shared Supabase project as `add_exported_to_activity_action_check`. Additive; no
existing row is affected. `ActivityAction` and `ACTION_STYLES` updated in step —
the constraint and the union type must not drift, since `logActivity` swallows
insert failures by design and the entry would vanish silently.

## Testing

32 new unit tests over the pure module (`applicationsExport.test.ts`,
`applicationFilter.test.ts`): formula injection both ways, quoting, the comma-in-
a-surname case, BOM, Manila date boundaries, filename collisions, header order.

Verified end to end against a production build: 401/307 unauthenticated;
`text/csv; charset=utf-8`; `attachment` with a dated filename; BOM present as
`EF BB BF` on the wire; filter honoured; bogus filter falls back to all; CV link
is a real signed URL returning 200; four `exported` rows in the activity log.

## Filters (added the same day, at the owner's request)

Status was the only filter. Role and an applied-date range were added, and the
decision that shaped everything else: **the filters live on the page, and the
export inherits them.** Export-only filters would mean two filtering systems and
no way to see what you were about to export.

- `lib/applicationFilter.ts` holds the model: `parseFilters`, `filtersToQuery`,
  `filterHref`, `exportHref`. Status tabs pass an *override*, so switching tab
  keeps the role and dates the reader just set.
- `lib/applicationQuery.ts` turns the model into predicates, **shared by the
  table and the export**. Separate `where` clauses would eventually disagree,
  and the failure mode is a file quietly containing different rows than the
  screen it came from. Structurally typed, so it is tested against a fake query
  object with no database.
- `components/admin/ApplicationFilters.tsx` is a plain GET form, no client
  JavaScript. The browser writes the query string the page already reads, so the
  view is bookmarkable, shareable, survives Back — and the export inherits the
  filters because they are in the URL rather than in component state.

Both date bounds are **inclusive Manila days** (`manilaStartOfDay` /
`manilaEndOfDay`). An application submitted at 00:30 Manila is stored as 16:30
the previous UTC day; bounding on the bare date string would drop it from a
single-day export and nobody would notice.

A backwards range is **swapped rather than returning nothing** — it is a typo,
not a request to see an empty table, and the corrected order shows back in the
inputs.

`isRealDate` is now exported from `lib/dates.ts` and used by `parseFilters`. The
shape regex alone accepts `2026-13-01` and `2026-02-30`, which would then be
dropped silently further down while the input still displayed them — a filter
that appears set but is not. A test caught this.

## Deliberately not built

- No ZIP of CV files. Much larger job, slow, and the heaviest privacy exposure.
- No XLSX.
- The activity log records *that* an export was filtered, not by what.
  Reconstructing the filter would mean resolving a job id to a title on a path
  whose job is to return a file.
