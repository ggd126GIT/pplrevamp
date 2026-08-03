/**
 * Signed, stateless form tokens used to reject submissions that arrive faster
 * than a human could have filled the form.
 *
 * The token is issued by `GET /api/form-token` when the form mounts and posted
 * back with the submission. Signing is what gives it teeth: an unsigned
 * client-supplied timestamp could simply be backdated by the bot.
 *
 * Like Turnstile, this ships INERT — with `FORM_TOKEN_SECRET` unset every form
 * behaves exactly as before, so it can be deployed before the secret exists.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Fastest plausible human fill. Every form here has at least four fields. */
export const MIN_FILL_MS = 2_000;

/**
 * Tokens are stateless, so they cannot be single-use. An expiry is what stops
 * one harvested token from feeding a bot indefinitely. Generous on purpose: a
 * visitor may leave the contact page open for hours before submitting.
 */
export const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

export type FormTokenResult = { ok: boolean; reason: string };

function sign(timestamp: number, secret: string): string {
  return createHmac("sha256", secret).update(String(timestamp)).digest("hex");
}

/** Returns null when the feature is disabled, so callers can omit the field. */
export function issueFormToken(now: number = Date.now()): string | null {
  const secret = process.env.FORM_TOKEN_SECRET;
  if (!secret) return null;
  return `${now}.${sign(now, secret)}`;
}

export function verifyFormToken(
  token: unknown,
  now: number = Date.now(),
): FormTokenResult {
  const secret = process.env.FORM_TOKEN_SECRET;
  if (!secret) return { ok: true, reason: "disabled" };

  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, reason: "missing" };
  }

  const [rawTimestamp, signature] = token.trim().split(".");
  if (!/^\d+$/.test(rawTimestamp ?? "") || !signature) {
    return { ok: false, reason: "malformed" };
  }

  const timestamp = Number(rawTimestamp);
  const expected = sign(timestamp, secret);
  // Length guard first: timingSafeEqual throws on a mismatch rather than
  // returning false.
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return { ok: false, reason: "bad-signature" };
  }

  const age = now - timestamp;
  // A negative age means a future-dated token; treating it as too-fast avoids a
  // clock-skew allowance that would also mint a token that never expires.
  if (age < MIN_FILL_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_TOKEN_AGE_MS) return { ok: false, reason: "expired" };

  return { ok: true, reason: "verified" };
}
