import { NextResponse } from "next/server";
import { clientIp, rateLimit, FORM_LIMITS } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import { sendInternalNotification, sendAutoReply, settleSends } from "@/lib/email";
import { HONEYPOT_FIELD, isEmail, isNonEmpty } from "@/lib/forms";
import { slugify } from "@/lib/slug";
import { acceptsApplications } from "@/lib/jobs";
import { verifyTurnstile } from "@/lib/turnstile";
import { verifyFormToken } from "@/lib/formToken";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`apply:${ip}`, FORM_LIMITS.apply);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (isNonEmpty(form.get(HONEYPOT_FIELD) as string)) {
    return NextResponse.json({ ok: true });
  }

  const timing = verifyFormToken(form.get("formToken"));
  if (!timing.ok) {
    console.warn("[apply] form token rejected:", timing.reason);
    return NextResponse.json(
      {
        ok: false,
        error:
          timing.reason === "expired"
            ? "This page has been open a while. Please refresh and try again."
            : "We couldn't verify your submission. Please refresh the page and try again.",
      },
      { status: 400 },
    );
  }

  const jobId = String(form.get("jobId") ?? "");
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim() || null;
  const cv = form.get("cv");

  if (!isNonEmpty(firstName) || !isNonEmpty(lastName)) {
    return NextResponse.json(
      { ok: false, error: "Please provide your first and last name." },
      { status: 400 },
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid email address." },
      { status: 400 },
    );
  }
  if (!(cv instanceof File) || cv.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Please attach your CV." },
      { status: 400 },
    );
  }
  if (cv.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Your CV must be under 2 MB." },
      { status: 400 },
    );
  }
  const ext = (cv.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported file type." },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[apply] Supabase service client not configured");
    return NextResponse.json(
      { ok: false, error: "Applications are temporarily unavailable." },
      { status: 503 },
    );
  }

  // A closed or expired role must not take applications. The public pages
  // filter it out and RLS hides it from the anon key, but this route uses the
  // service client — which bypasses RLS — on a jobId taken from the request.
  // Checked before the upload so a rejected submission leaves no file behind,
  // and before Turnstile so a doomed submission does not burn a single-use
  // token on a role that stopped accepting applications anyway.
  if (jobId) {
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("status, expires_at")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr) console.error("[apply] job lookup failed:", jobErr.message);
    if (jobErr || !job || !acceptsApplications(job)) {
      return NextResponse.json(
        { ok: false, error: "This role is no longer accepting applications." },
        { status: 400 },
      );
    }
  }

  // Before the upload specifically: an unverified submission must never put a
  // file in storage.
  const turnstile = await verifyTurnstile(form.get("cf-turnstile-response"), ip);
  if (!turnstile.ok) {
    console.warn("[apply] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 400 },
    );
  }

  // Upload CV to the private bucket.
  const path = `${jobId || "general"}/${Date.now()}-${slugify(
    `${firstName}-${lastName}`,
  )}.${ext}`;
  const buffer = Buffer.from(await cv.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("cvs")
    .upload(path, buffer, {
      contentType: cv.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    console.error("[apply] CV upload failed:", upErr.message);
    return NextResponse.json(
      { ok: false, error: "Could not upload your CV. Please try again." },
      { status: 500 },
    );
  }

  const { error: insErr } = await supabase.from("applications").insert({
    job_id: jobId || null,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    cv_url: path,
  });
  if (insErr) {
    console.error("[apply] insert failed:", insErr.message);
    return NextResponse.json(
      { ok: false, error: "Could not save your application. Please try again." },
      { status: 500 },
    );
  }

  await settleSends("apply", {
    "internal notification": sendInternalNotification(
      "New job application",
      {
        jobId,
        firstName,
        lastName,
        email,
        phone,
        cvPath: path,
      },
      {
        attachments: [
          { filename: `${slugify(`${firstName}-${lastName}`)}.${ext}`, content: buffer },
        ],
        // Applications go to the jobs inbox when one is configured.
        to: process.env.JOBS_NOTIFY_EMAIL,
      },
    ),
    "auto-reply": sendAutoReply(email, firstName),
  });

  return NextResponse.json({ ok: true });
}
