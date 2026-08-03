import { NextResponse } from "next/server";
import { clientIp, rateLimit, FORM_LIMITS } from "@/lib/rateLimit";
import { sendAutoReply, sendInternalNotification, settleSends } from "@/lib/email";
import {
  HONEYPOT_FIELD,
  isEmail,
  isNonEmpty,
  isWithinLength,
  MAX_MESSAGE_LENGTH,
  persistInquiry,
} from "@/lib/forms";
import { verifyTurnstile } from "@/lib/turnstile";
import { verifyFormToken } from "@/lib/formToken";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`discovery:${ip}`, FORM_LIMITS.discovery);
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

  // This form is multi-step, so the token is comfortably older than the minimum
  // by the time the final step is reached.
  const timing = verifyFormToken(body.formToken);
  if (!timing.ok) {
    console.warn("[discovery] form token rejected:", timing.reason);
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

  const turnstile = await verifyTurnstile(body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    console.warn("[discovery] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
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

  await settleSends("discovery", {
    "internal notification": sendInternalNotification(
      "New discovery / consultation request",
      payload,
    ),
    "auto-reply": sendAutoReply(b.email, b.fullName.split(" ")[0] ?? b.fullName),
  });

  return NextResponse.json({ ok: true });
}
