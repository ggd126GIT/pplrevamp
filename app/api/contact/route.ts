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
  const limit = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 60_000 });
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

  // Honeypot: silently accept bots but do nothing.
  if (isNonEmpty(body[HONEYPOT_FIELD])) {
    return NextResponse.json({ ok: true });
  }

  const {
    firstName,
    lastName,
    company,
    designation,
    email,
    phone,
    message,
  } = body as Record<string, string>;

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
  if (!isNonEmpty(message)) {
    return NextResponse.json(
      { ok: false, error: "Please include a message." },
      { status: 400 },
    );
  }
  if (!isWithinLength(message, MAX_MESSAGE_LENGTH)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Your message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const payload = {
    firstName,
    lastName,
    company,
    designation,
    email,
    phone,
    message,
  };

  await persistInquiry("contact", payload, body.sessionId as string | undefined);

  try {
    await Promise.all([
      sendInternalNotification("New contact inquiry", payload),
      sendAutoReply(email, firstName),
    ]);
  } catch (err) {
    console.error("[contact] email error:", err);
    // Submission is still recorded; don't fail the user.
  }

  return NextResponse.json({ ok: true });
}
