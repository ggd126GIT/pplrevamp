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
  const limit = rateLimit(`contact:${ip}`, FORM_LIMITS.contact);
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

  // Cheap and local, so it runs before the Turnstile network call. Unlike a
  // Turnstile token this one is reusable, so a failed field validation below
  // does not waste it.
  const timing = verifyFormToken(body.formToken);
  if (!timing.ok) {
    console.warn("[contact] form token rejected:", timing.reason);
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

  // Last gate before any side effect. Runs after validation so a correctable
  // mistake (bad email, empty message) never consumes the single-use token.
  const turnstile = await verifyTurnstile(body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    console.warn("[contact] turnstile rejected:", turnstile.reason);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
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

  // Submission is already recorded; a failed send must never fail the user,
  // and one failing send must not abort the other.
  await settleSends("contact", {
    "internal notification": sendInternalNotification("New contact inquiry", payload),
    "auto-reply": sendAutoReply(email, firstName),
  });

  return NextResponse.json({ ok: true });
}
