import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/admin/Pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";

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
