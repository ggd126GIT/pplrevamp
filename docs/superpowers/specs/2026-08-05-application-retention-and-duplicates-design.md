# Application Retention & Duplicate Detection — Design

**Date:** 2026-08-05
**Status:** spec for review — nothing implemented
**Source:** recruitment's request, relayed 2026-08-05 — delete CV attachments but keep the person,
catch duplicate applications (especially failed/blacklisted ones), against a target of **100
applications per quarter**

## The premise, corrected

The request is framed as saving space. Measured today: **1 application, 1 CV, 359 KB.**

At 100 applications/quarter — 400/year, at the observed ~360 KB average — that is roughly
**160 MB/year**, against 1 GB on Supabase's free tier and 100 GB on Pro. Storage will not be a
problem for years, and building this to save bytes would be building it for the wrong reason.

**Build it for retention instead.** Under the Data Privacy Act, personal data should not be kept
longer than the purpose requires, and a stack of rejected applicants' CVs is exactly what a client
audit asks about. That reframing changes the design: it argues for *automatic expiry*, not only a
manual button, because a policy that depends on someone remembering is not a policy.

It also means the two halves of the request pull the same way rather than fighting: the CV is the
part with retention risk and no ongoing value, while the **row** — name, contact, role, outcome — is
the part duplicate detection needs. Delete the file, keep the record.

## Current state

`applications`: `id, job_id, first_name, last_name, email, phone, cv_url, created_at`.

- **`cv_url` is `NOT NULL`** — so "keep the person, drop the file" is impossible without a schema
  change today.
- **No status anywhere.** Whether an applicant failed is not recorded in this system at all, so
  "flag failed applicants" cannot work until it is.
- **No normalisation and no indexes** on email or phone — nothing to match on.
- `/admin/applications` lists rows with a signed CV download link. That is the whole feature.

## Schema

```sql
-- Keep the person, drop the file.
alter table applications alter column cv_url drop not null;
alter table applications add column cv_deleted_at timestamptz;

-- Outcome. DigiOffice stays the full recruitment record; this is only enough to
-- answer "has this person been rejected before" at the moment a new one lands.
alter table applications add column status text not null default 'new'
  check (status in ('new','screening','interview','rejected','hired','withdrawn'));
alter table applications add column status_note text;
alter table applications add column status_updated_at timestamptz;
alter table applications add column reviewed_by uuid references profiles(id) on delete set null;

-- Match keys, generated so they can never drift from the source columns.
alter table applications add column email_key text
  generated always as (lower(trim(email))) stored;
-- Digits only, last 10: 0917 123 4567, +63 917 123 4567 and 09171234567 all
-- collapse to the same key.
alter table applications add column phone_key text
  generated always as (right(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g'), 10)) stored;

create index applications_email_key_idx on applications (email_key);
create index applications_phone_key_idx on applications (phone_key);

-- Blacklist is per PERSON, not per application.
create table applicant_blocks (
  email_key   text primary key,
  reason      text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);
```

`reason` is `not null` deliberately — see Privacy below.

## Duplicate detection

Two confidence levels, because one is a fact and the other is a guess:

| | Rule | Shown as |
|---|---|---|
| **Confirmed** | same `email_key` | "3rd application — same email", with prior dates, roles and outcomes |
| **Possible** | same `phone_key` (10 digits, non-empty) **or** same `lower(first_name)` + `lower(last_name)` — and *not* already a confirmed match | "Possible repeat — same phone as J. Cruz (Mar 2026)", for a human to judge |

Possible matches are never asserted as fact. Two people genuinely share a name, and a household can
share a phone number; auto-rejecting on that would quietly lose real candidates.

**How it is computed:** fetch the page of applications, then one query for every prior application
whose `email_key`/`phone_key`/name matches anything on that page, and pair them up in a **pure
function** — `lib/applicantMatch.ts`, unit-tested, since vitest here runs `environment: "node"` and
collects only `**/*.test.ts`. At 400 rows/year this is trivially cheap; no view or trigger needed.

**Blacklist** is checked separately, by `email_key`, and shown loudly on any matching application.

## CV removal

**Manual.** A "Delete CV" action per application: remove the object via the storage API, then set
`cv_url = null, cv_deleted_at = now()`. Behind a confirm — it is irreversible and the applicant is
unlikely to send it twice. `cv_deleted_at` is what distinguishes "we deleted this" from "there never
was one", which matters when someone asks why a row has no attachment.

**Automatic.** A purge route that deletes CVs older than `CV_RETENTION_DAYS` (proposed: **365**, env
configurable), run daily. Two ways to trigger it on this stack:

- a **cron on the VPS** hitting the route with a shared secret — simplest, and the box already runs
  the app; or
- **`pg_cron` + `net.http_post`** from Supabase — no VPS dependency, but the secret then lives in the
  database.

Recommend the VPS cron: one less place holding a credential, and the deploy story is already there.

The route must delete **the storage object**, not just the `storage.objects` row, or the underlying
file lingers while the record says it is gone.

## Admin UI

- Status control per application (same shape as the inquiry status control shipped in `3a3b115`).
- Duplicate banner on any application with prior matches, listing date, role and outcome.
- Blacklist badge, plus add/remove with a required reason.
- CV cell becomes: `[Download] [Delete CV]`, or `Deleted 12 Aug 2026` once gone.
- A filter for status, so "show me everyone rejected" is one click.

## Privacy — worth deciding before building, not after

This feature stores judgements about named people, which is a step up from storing their CV.

1. **A blacklist needs a lawful basis and a factual reason.** `reason` is `not null` to force one.
   "No-show for two scheduled interviews" is a fact; "difficult" is an opinion that will not survive
   being disclosed. Assume the applicant may one day request access to it — the DPA gives them that
   right.
2. **State the retention period publicly.** The privacy policy should say how long application data
   is kept. It currently does not, and adding automatic expiry is the natural moment to add it.
3. **Deleting the CV does not anonymise the row.** Name, email, phone and outcome remain personal
   data. If the goal is ever full erasure, that needs a separate "delete applicant" action — out of
   scope here, but worth knowing it is not what this does.
4. **Who may see the blacklist?** Every admin account is currently effectively an admin
   (`profiles.role` is decorative — see `[[admin-roles-not-enforced]]`), so anyone with a login will
   see it. Fine for a small team; a deliberate choice rather than an accident.

## Sequencing

1. Schema + generated match keys + indexes.
2. `lib/applicantMatch.ts` with tests, and the duplicate banner (read-only — value on day one, no new
   data required).
3. Status control, so outcomes start accumulating. **Duplicate flagging is only as useful as the
   outcome history behind it, and that history starts empty** — this step is worth doing early even
   though it pays off later.
4. Manual "Delete CV".
5. Blacklist.
6. Automatic expiry + the privacy-policy wording.

## Out of scope

- Two-way sync with DigiOffice. It remains the recruitment record; this stores only enough outcome to
  answer the duplicate question.
- CV parsing, scoring, or any automated ranking of applicants.
- Full applicant erasure (see Privacy 3).
- Notifying an applicant that they have applied before.
