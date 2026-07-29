# Staff identity + content attribution — design

**Date:** 2026-07-29
**Status:** approved, ready for planning

## Problem

Three real staff accounts now exist (Joey Lianko, Tina Loneza, Clari Porras) alongside two
developer accounts. They share one admin panel and, because `profiles.role` is enforced
nowhere, identical powers: anyone can create, edit, publish, or delete any post or job.

Two gaps follow from that:

1. **You cannot tell who you are signed in as.** `app/admin/layout.tsx:37` does render
   `user.email`, but at 50% opacity, unlabelled, at the foot of the desktop sidebar — and the
   mobile top bar omits it entirely.
2. **You cannot tell who did what.** `posts.author_id` is populated on create but displayed
   nowhere and never updated on edit. `jobs` has no attribution column at all. Nothing records
   edits, publishes, or deletions by anyone.

With shared credentials and no role gate, attribution is the only accountability mechanism the
panel has.

## Non-goals

- **Enforcing roles.** Making `profiles.role` mean something is separate work, already scoped at
  roughly a day, and gated on a client decision about who writes vs who approves. This design
  records what happened; it does not restrict who may do it.
- **Diffing content.** The log records that a post was edited, not which words changed.
- **Attribution for applications and inquiries.** Those are visitor-submitted, not staff-authored.

## Data model

### `profiles` — add `email`

```sql
alter table profiles add column email text;
```

Backfilled from `auth.users`, and the existing `handle_new_user()` trigger extended to populate
it on signup. Used solely as the display fallback when `full_name` is blank — `full_name` is
nullable and self-editable, so without a fallback attribution can silently render empty.

`profiles` is readable only by authenticated staff (`profiles read (auth)`, `qual = true`), so
this exposes no email publicly.

### `posts` — reuse `author_id`, add two columns

```sql
alter table posts add column updated_by   uuid references profiles(id) on delete set null;
alter table posts add column published_by uuid references profiles(id) on delete set null;
```

`author_id` already exists, already means "creator", and is already populated. It serves as
`created_by`; adding a second column with the same meaning would be redundant and require a
backfill.

### `jobs` — add two columns

```sql
alter table jobs add column created_by uuid references profiles(id) on delete set null;
alter table jobs add column updated_by uuid references profiles(id) on delete set null;
```

Jobs have no publish concept — their lifecycle is `open`/`closed` — so there is no
`published_by` counterpart.

### `activity` — new, append-only

```sql
create table activity (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  actor_label  text not null,
  entity_type  text not null check (entity_type in ('post','job')),
  entity_id    uuid,
  entity_title text not null,
  action       text not null check (action in
                 ('created','edited','published','unpublished','opened','closed','deleted')),
  created_at   timestamptz default now()
);

create index activity_created_at_idx on activity (created_at desc);
create index activity_entity_idx     on activity (entity_type, entity_id);
```

Three deliberate choices:

**`entity_id` carries no foreign key.** A cascade would delete the record of a deletion, which is
the entry most worth keeping. The column is a weak reference; a row whose entity no longer exists
is expected, not corrupt.

**`actor_label` and `entity_title` are snapshots** taken at write time. The log therefore still
renders after a post is deleted or a profile renamed. This is ordinary audit-log behaviour: an
entry states what was true when the action happened, so correcting a typo in your name does not
rewrite history. `actor_id` is retained alongside the label for anyone who wants the live profile.

**The action list spans both entity types.** Posts use `published`/`unpublished`; jobs use
`opened`/`closed`. Both use `created`, `edited`, `deleted`.

### RLS

```sql
alter table activity enable row level security;

create policy "activity staff read"   on activity for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "activity staff insert" on activity for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid()));
```

No `update` or `delete` policy is defined. Under RLS an absent policy denies, so the table is
append-only by construction — not by convention. No staff member, admin or otherwise, can rewrite
or quietly prune the log through the API.

## Write path

A single helper module, `lib/activity.ts`:

```ts
logActivity(supabase, {
  action, entityType, entityId, entityTitle
}): Promise<void>
```

It resolves the acting user and their display label internally, so callers pass only what they
know. Called from the six existing server actions in `app/admin/posts/actions.ts` and
`app/admin/jobs/actions.ts`.

Three rules govern every call site:

1. **Log after the mutation succeeds.** An action that failed did not happen and must not appear.
2. **A logging failure must never surface to the user.** `logActivity` catches its own errors and
   reports them to the server console. Losing a log entry is bad; losing someone's blog post
   because the log write failed is worse.
3. **Deletes capture the title before deleting.** After the row is gone the title is
   unrecoverable, so `deletePost`/`deleteJob` select it first.

### Deriving the action from a status transition

`deriveAction(prevStatus, nextStatus, entityType)` is the one piece of real branching:

| Previous | Next | Post | Job |
|---|---|---|---|
| `draft` | `published` | `published` | — |
| `published` | `draft` | `unpublished` | — |
| `closed` | `open` | — | `opened` |
| `open` | `closed` | — | `closed` |
| unchanged | unchanged | `edited` | `edited` |

Creating an item that is already live writes **two** rows — `created`, then `published` (or
`opened`) — so the timeline reads honestly rather than implying it was quietly born public.

## UI

**`app/admin/layout.tsx`** — the desktop sidebar gains an explicit "You're logged in as" label
with the email at readable contrast, and the mobile top bar gains the same, since it currently
shows no identity at all.

**Posts and jobs lists** — one attribution line per row:
`Created by Joey Lianko · Last edited by Tina Loneza, 2h ago`. Requires joining `profiles` on the
creator and updater columns.

**`/admin/activity`** — a new nav item (`History` icon), paginated 15 per page through the
existing `lib/pagination.ts`, with All / Posts / Jobs filter tabs driven by a search param.

**`/admin` dashboard** — a "Recent activity" card showing the five newest entries with a
"View all →" link.

Relative timestamps need a `timeAgo()` helper; none exists in the codebase today (`lib/analytics/
format.ts` has only `placeLabel` and `journeyLocation`). It lives in `lib/activity.ts`.

## Existing data

No synthetic backfill. Inventing history that nobody can vouch for is worse than an honest blank.
In practice:

- 4 of the 5 existing posts show their real `author_id` — the `admin@ppl.com` developer account,
  so "Admin". The original seed post (`why-the-philippines-for-bpo`) has a null `author_id` and
  shows `—`.
- The 4 existing jobs show `—` for creator.
- `updated_by` / `published_by` are null everywhere until the next edit.
- The activity feed starts empty and fills from the next action onward.

## Testing

Vitest, joining the existing 66-test suite:

- `deriveAction` across every transition in the table above, both entity types.
- `actorLabel` fallback: full name present, full name blank, both blank.
- `timeAgo` boundaries: each unit switch, the 30-day fall-back to an absolute date, a
  future timestamp from clock skew, and unparseable input.

The UI additions are server components reading Supabase and are covered by the existing manual
staging verification pass rather than new tests.

## Migration mechanics

Per this project's established pattern, schema changes are applied directly to the shared Supabase
project (`ebnjvbppgcifxrcqozhj`) via MCP rather than committed as local migration files, and
`lib/database.types.ts` is hand-edited to match rather than regenerated.

**This lands on the live shared database.** Staging and production are the same project, so the
`profiles.email` backfill and the new table take effect for the client's staging review
immediately. All changes are additive — new nullable columns and a new table — so nothing existing
breaks.
