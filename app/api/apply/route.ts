import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import { sendInternalNotification, sendAutoReply } from "@/lib/email";
import { HONEYPOT_FIELD, isEmail, isNonEmpty } from "@/lib/forms";
import { slugify } from "@/lib/slug";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`apply:${ip}`, { limit: 5, windowMs: 60_000 });
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

  try {
    await Promise.all([
      sendInternalNotification(
        "New job application",
        {
          jobId,
          firstName,
          lastName,
          email,
          phone,
          cvPath: path,
        },
        [{ filename: `${slugify(`${firstName}-${lastName}`)}.${ext}`, content: buffer }],
      ),
      sendAutoReply(email, firstName),
    ]);
  } catch (err) {
    console.error("[apply] email error:", err);
  }

  return NextResponse.json({ ok: true });
}
