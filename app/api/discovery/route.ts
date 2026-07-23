import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { sendAutoReply, sendInternalNotification } from "@/lib/email";
import {
  HONEYPOT_FIELD,
  isEmail,
  isNonEmpty,
  isWithinLength,
  MAX_MESSAGE_LENGTH,
  persistInquiry,
} from "@/lib/forms";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`discovery:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (isNonEmpty(body[HONEYPOT_FIELD])) {
    return NextResponse.json({ ok: true });
  }

  const b = body as Record<string, string>;

  // Contact details are the minimum required to follow up.
  if (!isNonEmpty(b.fullName)) {
    return NextResponse.json(
      { ok: false, error: "Please provide your name." },
      { status: 400 },
    );
  }
  if (!isEmail(b.email)) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid email address." },
      { status: 400 },
    );
  }
  // Goals is optional free text; cap it when present.
  if (isNonEmpty(b.goals) && !isWithinLength(b.goals, MAX_MESSAGE_LENGTH)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Your goals message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const payload = {
    // Company
    company: b.company,
    industry: b.industry,
    companySize: b.companySize,
    // Engagement
    model: b.model,
    services: b.services,
    teamSize: b.teamSize,
    timeline: b.timeline,
    // Contact
    fullName: b.fullName,
    designation: b.designation,
    email: b.email,
    phone: b.phone,
    goals: b.goals,
  };

  await persistInquiry("discovery", payload, b.sessionId as string | undefined);

  try {
    await Promise.all([
      sendInternalNotification("New discovery / consultation request", payload),
      sendAutoReply(b.email, b.fullName.split(" ")[0] ?? b.fullName),
    ]);
  } catch (err) {
    console.error("[discovery] email error:", err);
  }

  return NextResponse.json({ ok: true });
}
