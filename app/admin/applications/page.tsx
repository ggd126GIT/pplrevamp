import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/admin/Pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";
import { DuplicateBadge } from "@/components/admin/DuplicateBadge";
import { matchApplicants, type ApplicantRow } from "@/lib/applicantMatch";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const { data: applications, count } = await supabase
    .from("applications")
    .select("*, jobs(title, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

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

      {!withCv.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          No applications yet.
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
                      blocked={
                        app.email_key ? blockedBy.get(app.email_key) : null
                      }
                    />
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
                  <td className="px-5 py-4">
                    {app.cvSignedUrl ? (
                      <a
                        href={app.cvSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-purple/10 px-3 py-1.5 text-xs font-semibold text-purple hover:bg-purple/20"
                      >
                        <Download className="size-3.5" /> Download
                      </a>
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

      <Pagination
        page={page}
        pageCount={pageCount(count)}
        basePath="/admin/applications"
      />
    </div>
  );
}
