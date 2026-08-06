import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetail } from "@/components/careers/JobDetail";
import { PreviewBanner } from "@/components/admin/PreviewBanner";
import { createClient } from "@/lib/supabase/server";
import { isExpired } from "@/lib/jobs";

/** A preview must read the database now — never a cached or prerendered copy. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function JobPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  // THE guard. Middleware also covers /preview, but that is a path-prefix string
  // check duplicated across two files — if either ever drifts, this is what still
  // stops an anonymous visitor reading unpublished work. notFound() rather than a
  // 401 so the route does not advertise that it exists.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { id } = await params;
  // No status or expiry filter — that is the entire point. Readable because
  // "jobs auth read all" already grants authenticated staff every row.
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const status = isExpired(job.expires_at)
    ? `${job.status} · expired`
    : job.status;

  return (
    <>
      <PreviewBanner
        status={status}
        label={job.title}
        editHref={`/admin/jobs/${job.id}`}
      />
      {/* No JobPosting schema on a preview — structured data belongs only on the
          canonical public posting. */}
      <JobDetail job={job} includeSchema={false} />
    </>
  );
}
