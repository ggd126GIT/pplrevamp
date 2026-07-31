-- Record of a migration applied via the Supabase MCP tool
-- (migration name: add_expires_at_to_jobs). This project keeps no
-- supabase/ directory and no migration history file — this SQL was
-- applied directly against the hosted database and this file exists
-- only as a record of what is live. Do not run it blindly: re-running
-- the `alter table` or `create index` statements against a database
-- that already has them will error, and the `drop policy` statement
-- will fail if the policy name has since changed.
--
-- Verified against the live database on 2026-08-01 via
-- information_schema.columns, pg_indexes, and pg_policies for
-- public.jobs — matches exactly.

alter table public.jobs add column expires_at timestamptz;

create index jobs_public_read_idx on public.jobs (status, expires_at);

-- Enforce expiry at the database, not only in queries. All three public read
-- paths use the anon key, so this covers them even if a query forgets its filter.
drop policy "jobs public read open" on public.jobs;
create policy "jobs public read open" on public.jobs for select to public
  using (status = 'open' and (expires_at is null or expires_at > now()));
