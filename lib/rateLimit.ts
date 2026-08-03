/**
 * Minimal in-memory rate limiter (per server instance). Good enough for basic
 * abuse protection on public form endpoints; for multi-instance deployments
 * swap for a shared store (e.g. Upstash) later.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Per-visitor submission budgets for the public forms, single-sourced so the
 * enquiry routes cannot drift apart.
 *
 * Contact and discovery are deliberately tight: both deliver to the same sales
 * inbox, and nobody has three genuine enquiries in ten minutes. Applications
 * stay looser — one person may apply to several roles in a sitting, and a CV
 * upload is the submission most likely to need a retry.
 */
export const FORM_LIMITS = {
  contact: { limit: 3, windowMs: 10 * 60_000 },
  discovery: { limit: 3, windowMs: 10 * 60_000 },
  apply: { limit: 5, windowMs: 60_000 },
} as const;

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * Headers set by our own infrastructure, in descending order of trust.
 * `cf-connecting-ip` is written by Cloudflare, which discards any client-supplied
 * copy; `x-real-ip` is written by nginx from `$remote_addr`, which the `real_ip`
 * module has already corrected to the true client address.
 */
const TRUSTED_IP_HEADERS = ["cf-connecting-ip", "x-real-ip"] as const;

/**
 * Best-effort client IP from proxy headers, used to key rate-limit buckets.
 *
 * Order matters for abuse protection. `x-forwarded-for` is client-supplied, and
 * nginx *appends* the real address rather than replacing it — so its first entry
 * is attacker-controlled. Reading it first meant anyone could reset their own
 * rate-limit bucket on every request by sending one extra header, which defeated
 * the limiter entirely. It is therefore only a fallback, for environments that
 * populate nothing better (e.g. some Vercel paths).
 */
export function clientIp(headers: Headers): string {
  for (const name of TRUSTED_IP_HEADERS) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }

  for (const entry of (headers.get("x-forwarded-for") ?? "").split(",")) {
    const value = entry.trim();
    if (value) return value;
  }

  return "unknown";
}
