import { timingSafeEqual } from "node:crypto";
import { getServiceClient } from "@/lib/supabase/service";
import { cutoffIso, retentionDays } from "@/lib/cvRetention";

/**
 * Deletes CV files past the retention window, keeping the application row.
 *
 * Driven by a cron on the VPS rather than `pg_cron`, so the shared secret lives
 * in one place (the app's env) instead of also in the database. See
 * `DEPLOY-VPS.md` for the crontab line.
 *
 * A policy that depends on someone remembering to click a button is not a
 * policy — that is the whole reason this exists alongside the manual button.
 */

/** Never cached, never prerendered: it mutates and must run on demand. */
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Unset means the endpoint is off, NOT open. An unauthenticated route that
  // deletes files is not something to leave to a missing env var.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const given = Buffer.from(header.slice(prefix.length));
  const want = Buffer.from(secret);
  // Length must match before timingSafeEqual, which throws on a mismatch.
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    // 404 rather than 401: the route does not advertise itself to a scanner.
    return new Response(null, { status: 404 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[purge-cvs] service client unavailable");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const days = retentionDays(process.env.CV_RETENTION_DAYS);
  const cutoff = cutoffIso(days);

  const { data: stale, error: readErr } = await supabase
    .from("applications")
    .select("id, cv_url")
    .not("cv_url", "is", null)
    .lt("created_at", cutoff);

  if (readErr) {
    console.error("[purge-cvs] read failed:", readErr.message);
    return Response.json({ error: "read failed" }, { status: 500 });
  }

  let purged = 0;
  const failed: string[] = [];

  for (const app of stale ?? []) {
    if (!app.cv_url) continue;

    // Storage object FIRST, reference second — the same ordering as the manual
    // delete. The other order orphans the file in the bucket: invisible in the
    // admin, still held, still personal data, and it looks like success.
    const { error: storageErr } = await supabase.storage
      .from("cvs")
      .remove([app.cv_url]);

    if (storageErr) {
      console.error(
        `[purge-cvs] storage delete failed for ${app.id}:`,
        storageErr.message,
      );
      failed.push(app.id);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("applications")
      .update({ cv_url: null, cv_deleted_at: new Date().toISOString() })
      .eq("id", app.id);

    if (updateErr) {
      // The file is gone but the row still points at it. Loud, because the
      // next run will retry the storage delete and see "not found".
      console.error(
        `[purge-cvs] reference clear failed for ${app.id}:`,
        updateErr.message,
      );
      failed.push(app.id);
      continue;
    }

    purged += 1;
  }

  // Logged unconditionally: a cron with no output is a cron nobody notices has
  // stopped running.
  console.log(
    `[purge-cvs] retention ${days}d, cutoff ${cutoff}, considered ${stale?.length ?? 0}, purged ${purged}, failed ${failed.length}`,
  );

  return Response.json({
    retentionDays: days,
    cutoff,
    considered: stale?.length ?? 0,
    purged,
    failed: failed.length,
  });
}
