import {
  deriveSource,
  deviceFromUserAgent,
  extractUtm,
  geoFromHeaders,
  isBot,
  isUuid,
  referrerHost,
  sanitizePath,
} from "@/lib/analytics/parse";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/database.types";

/** Always 204: the tracker is invisible to visitors and must never retry. */
const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    if (!rateLimit(`track:${ip}`, { limit: 120, windowMs: 60_000 }).ok) {
      return noContent();
    }

    const ua = request.headers.get("user-agent");
    if (isBot(ua)) return noContent();

    const body = (await request.json()) as Record<string, unknown>;

    const path = sanitizePath(body.path);
    const sessionId = body.sessionId;
    if (!path || !isUuid(sessionId)) return noContent();

    const siteHost = new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com",
    ).hostname;

    const host = referrerHost(
      typeof body.referrer === "string" ? body.referrer : null,
      siteHost,
    );
    const utm = extractUtm(typeof body.query === "string" ? body.query : "");

    const supabase = getServiceClient();
    if (!supabase) return noContent();

    // IP and raw user-agent are intentionally never persisted.
    const { error } = await supabase.from("page_views").insert({
      session_id: sessionId,
      path,
      referrer: host,
      source: deriveSource(host, utm?.utm_source),
      utm: (utm as Json) ?? null,
      device: deviceFromUserAgent(ua),
      country: geoFromHeaders(request.headers).country,
      is_staging: Boolean(process.env.STAGING_PASSWORD),
    });
    if (error) console.error("[track] insert failed:", error.message);
  } catch (err) {
    console.error("[track] unexpected error:", err);
  }
  return noContent();
}
