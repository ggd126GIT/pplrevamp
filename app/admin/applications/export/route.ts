import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { parseStatusFilter } from "@/lib/applicationFilter";
import {
  exportFilename,
  toCsv,
  type ExportRow,
} from "@/lib/applicationsExport";

/** How long an exported CV link keeps working. Agreed with the owner. */
const CV_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * A hard ceiling, not a page size. The export is meant to return everything
 * matching the filter, and at a few hundred applications a year this will not
 * be reached — but an unbounded query against a table of personal data is the
 * kind of thing that only becomes a problem once.
 */
const MAX_ROWS = 5000;

/**
 * CSV export of job applications, honouring the status filter in the query
 * string exactly as the page's filter tabs do.
 *
 * A GET route rather than a server action, so the button is a plain link and
 * the browser handles the download natively.
 *
 * `/admin/*` is already behind `updateSession` in `proxy.ts`, but this endpoint
 * emits every applicant's name, email and phone in one response, so it checks
 * the session itself as well. One misconfigured matcher should not be all that
 * stands between the public and the whole applicant table.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const status = parseStatusFilter(
    request.nextUrl.searchParams.get("status") ?? undefined,
  );

  let query = supabase
    .from("applications")
    .select("first_name, last_name, email, phone, cv_url, created_at, status, jobs(title)")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (status) query = query.eq("status", status);

  const { data: applications, error } = await query;
  if (error) {
    console.error("[applications export] query failed:", error.message);
    return new NextResponse("Export failed", { status: 500 });
  }

  const rows = applications ?? [];

  // One batched call for every CV, not one call per row: the page signs URLs
  // individually because it only ever shows 15, but an export of several
  // hundred would make several hundred round trips.
  const paths = rows.map((r) => r.cv_url).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data, error: signError } = await supabase.storage
      .from("cvs")
      .createSignedUrls(paths, CV_LINK_TTL_SECONDS);
    if (signError) {
      // A CSV with empty CV links beats no CSV at all — the contact details are
      // the part that cannot be reconstructed elsewhere.
      console.error("[applications export] signing failed:", signError.message);
    }
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  const exportRows: ExportRow[] = rows.map((r) => ({
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone,
    job_title: r.jobs?.title ?? null,
    created_at: r.created_at,
    status: r.status,
    cv_link: r.cv_url ? (signed.get(r.cv_url) ?? null) : null,
  }));

  const filename = exportFilename(status);

  // Personal data leaving the system is exactly what the activity log is for.
  // After the query, so a failed export is not recorded as one.
  await logActivity(supabase, {
    action: "exported",
    entityType: "application",
    entityId: null,
    entityTitle: `${exportRows.length} application${
      exportRows.length === 1 ? "" : "s"
    }${status ? ` (${status})` : ""}`,
    actorId: user.id,
  });

  return new NextResponse(toCsv(exportRows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      // Personal data: never let a proxy or the browser keep a copy.
      "cache-control": "no-store, private",
    },
  });
}
