import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/admin/Pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";
import { DuplicateBadge } from "@/components/admin/DuplicateBadge";
import { DeleteCvButton } from "@/components/admin/DeleteCvButton";
import { matchApplicants, type ApplicantRow } from "@/lib/applicantMatch";
import { formatManilaDate } from "@/lib/dates";
import {
  ApplicationStatusForm,
  ApplicationStatusBadge,
} from "@/components/admin/ApplicationStatus";
import { BlockApplicantButton } from "@/components/admin/BlockApplicantButton";
import { APPLICATION_STATUSES } from "@/lib/applicationStatus";
import {
  filterHref,
  hasActiveFilters,
  parseFilters,
} from "@/lib/applicationFilter";
import { ApplicationFilters } from "@/components/admin/ApplicationFilters";
import { applyApplicationFilters } from "@/lib/applicationQuery";
import { cn } from "@/lib/cn";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    job?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const filters = parseFilters(params);
  const statusFilter = filters.status;
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("*, jobs(title, slug)", { count: "exact" });
  query = applyApplicationFilters(query, filters);

  const [{ data: applications, count }, { data: jobOptions }] =
    await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to),
      // Every job, not just those with applications: a role with none is
      // exactly the one someone wants to check.
      supabase.from("jobs").select("id, title").order("title"),
    ]);

  // Everything this page's applicants could match against. At a few hundred
  // rows a year this is cheaper than a per-row query or a database view, and it
  // keeps the matching rules in one tested place rather than in SQL.
  const emailKeys = [
    ...new Set((applications ?? []).map((a) => a.email_key).filter(Boolean)),
  ] as string[];
  const phoneKeys = [
    ...new Set(
      (applications ?? []).map((a) => a.phone_key).filter((k) => !!k && k.length === 10),
    ),
  ] as string[];

  const [{ data: related }, { data: blocks }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, first_name, last_name, email_key, phone_key, created_at, status, jobs(title)")
      .or(
        [
          emailKeys.length ? `email_key.in.(${emailKeys.join(",")})` : "",
          phoneKeys.length ? `phone_key.in.(${phoneKeys.join(",")})` : "",
        ]
          .filter(Boolean)
          .join(",") || "id.is.null",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    emailKeys.length
      ? supabase
          .from("applicant_blocks")
          .select("email_key, reason")
          .in("email_key", emailKeys)
      : Promise.resolve({ data: [] as { email_key: string; reason: string }[] }),
  ]);

  const blockedBy = new Map(
    (blocks ?? []).map((b) => [b.email_key, b.reason] as const),
  );

  const candidates: ApplicantRow[] = (related ?? []).map((r) => ({
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    email_key: r.email_key,
    phone_key: r.phone_key,
    created_at: r.created_at,
    status: r.status,
    job_title: r.jobs?.title ?? null,
  }));

  // Signed URLs for private CVs (1 hour).
  const withCv = await Promise.all(
    (applications ?? []).map(async (app) => {
      let cvSignedUrl: string | null = null;
      if (app.cv_url) {
        const { data } = await supabase.storage
          .from("cvs")
          .createSignedUrl(app.cv_url, 3600);
        cvSignedUrl = data?.signedUrl ?? null;
      }
      return { ...app, cvSignedUrl };
    }),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Applications</h1>
      <p className="mt-1 text-charcoal/60">
        Job applications with downloadable CVs.
      </p>

      <div className="mt-6">
        {/* Filter tabs. Plain links, so the current filter is shareable and the
            browser Back button behaves. Export lives in the filter bar below,
            beside Apply, so narrowing and exporting are one place. */}
        <div className="flex flex-wrap gap-1.5">
          {[null, ...APPLICATION_STATUSES].map((s) => (
            <a
              key={s ?? "all"}
              // Override only the status, so switching tabs keeps the role and
              // date range the reader just set.
              href={filterHref(filters, { status: s })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                s === statusFilter
                  ? "bg-ink text-white"
                  : "border border-black/10 text-charcoal/60 hover:bg-mist",
              )}
            >
              {s ?? "All"}
            </a>
          ))}
        </div>
      </div>

      <ApplicationFilters
        filters={filters}
        jobs={jobOptions ?? []}
        canExport={!!count}
      />

      {!withCv.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          {hasActiveFilters(filters)
            ? // Saying "none yet" under a filter would read as "no applications
              // at all", which is a different and alarming statement.
              "No applications match these filters."
            : "No applications yet."}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-5 py-3 font-semibold">Applicant</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Applied</th>
                <th className="px-5 py-3 font-semibold">Outcome</th>
                <th className="px-5 py-3 font-semibold">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {withCv.map((app) => (
                <tr key={app.id} className="align-top">
                  <td className="px-5 py-4 font-medium text-ink">
                    {app.first_name} {app.last_name}
                    <DuplicateBadge
                      matches={matchApplicants(
                        {
                          id: app.id,
                          first_name: app.first_name,
                          last_name: app.last_name,
                          email_key: app.email_key,
                          phone_key: app.phone_key,
                          created_at: app.created_at,
                          status: app.status,
                        },
                        candidates,
                      )}
                      createdAt={app.created_at}
                      blocked={
                        app.email_key ? blockedBy.get(app.email_key) : null
                      }
                    />
                    {app.email_key && (
                      <div className="mt-2">
                        <BlockApplicantButton
                          emailKey={app.email_key}
                          blocked={blockedBy.has(app.email_key)}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-charcoal/70">
                    {app.jobs?.title ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-charcoal/70">
                    <a
                      href={`mailto:${app.email}`}
                      className="text-purple hover:underline"
                    >
                      {app.email}
                    </a>
                    {app.phone && <div>{app.phone}</div>}
                  </td>
                  <td className="px-5 py-4 text-charcoal/60">
                    {app.created_at
                      ? new Date(app.created_at).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="w-52 px-5 py-4">
                    <ApplicationStatusBadge status={app.status} />
                    <ApplicationStatusForm
                      id={app.id}
                      status={app.status}
                      note={app.status_note}
                    />
                    {app.status_updated_at && (
                      <p className="mt-1.5 text-[11px] text-charcoal/40">
                        Updated {formatManilaDate(app.status_updated_at)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {app.cvSignedUrl ? (
                      // Stacked, not side by side: `space-y-*` only adds margin
                      // and these are inline-flex, so they sat on one line with
                      // Delete a few pixels from Download. Keeping the
                      // destructive action clear of the routine one matters more
                      // than the row being compact.
                      <div className="flex flex-col items-start gap-2.5">
                        <a
                          href={app.cvSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-purple/10 px-3 py-1.5 text-xs font-semibold text-purple hover:bg-purple/20"
                        >
                          <Download className="size-3.5" /> Download
                        </a>
                        <DeleteCvButton id={app.id} />
                      </div>
                    ) : app.cv_deleted_at ? (
                      // Distinguishes "we deleted this" from "there never was
                      // one", which is the question asked six months later.
                      <span className="inline-flex items-center gap-1.5 text-xs text-charcoal/50">
                        <FileText className="size-3.5" /> Deleted{" "}
                        {formatManilaDate(app.cv_deleted_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-charcoal/40">
                        <FileText className="size-3.5" /> Unavailable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* basePath carries the filter, so paging never silently drops it —
          Pagination appends `&page=N` when a query string is already there. */}
      <Pagination
        page={page}
        pageCount={pageCount(count)}
        basePath={filterHref(filters)}
      />
    </div>
  );
}
