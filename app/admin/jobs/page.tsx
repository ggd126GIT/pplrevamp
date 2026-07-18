import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Jobs</h1>
          <p className="mt-1 text-charcoal/60">Manage open positions.</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-grad-from to-grad-to px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="size-4" /> New job
        </Link>
      </div>

      {!jobs?.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          No jobs yet.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}`}
              className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-mist"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="truncate font-semibold text-ink">
                    {job.title}
                  </h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      job.status === "open"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-black/5 text-charcoal/50",
                    )}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-charcoal/60">
                  {[job.department, job.location, job.work_mode]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <Pencil className="size-4 shrink-0 text-charcoal/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
