/**
 * Cloudflare Turnstile verification for the public forms.
 *
 * Deliberately fails OPEN when Cloudflare cannot be reached: an outage there
 * would otherwise take contact and job applications offline site-wide, and the
 * honeypot plus per-IP rate limiting still apply. A token Cloudflare actively
 * reports as invalid is still rejected.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cap the wait so a hanging request cannot hold a form submission open. */
const TIMEOUT_MS = 5_000;

export type TurnstileResult = { ok: boolean; reason: string };

export async function verifyTurnstile(
  token: unknown,
  ip: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: "disabled" };

  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, reason: "missing" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify returned HTTP", res.status);
      return { ok: true, reason: "unreachable" };
    }

    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (json.success) return { ok: true, reason: "verified" };
    return { ok: false, reason: json["error-codes"]?.[0] ?? "failed" };
  } catch (err) {
    console.error("[turnstile] siteverify unreachable:", err);
    return { ok: true, reason: "unreachable" };
  }
}
