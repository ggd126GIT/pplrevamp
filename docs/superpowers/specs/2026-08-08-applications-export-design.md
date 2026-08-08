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
| Filter | **Inherited from the page** | Click "rejected", hit Export, get the rejected ones. Per-status shortlists for free, no new UI. |
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

## Deliberately not built

- No ZIP of CV files. Much larger job, slow, and the heaviest privacy exposure.
- No date-range filter. Status is the filter that exists; adding another needs a
  reason.
- No XLSX.
