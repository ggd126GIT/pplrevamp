import { isBot, normalizeEventBatch } from "@/lib/analytics/parse";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/database.types";

/** Always 204: the tracker is invisible to visitors and must never retry. */
const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    // Batched, so one request per page view — a lower ceiling than /api/track.
    if (!rateLimit(`events:${ip}`, { limit: 30, windowMs: 60_000 }).ok) {
      return noContent();
    }

    if (isBot(request.headers.get("user-agent"))) return noContent();

    const batch = normalizeEventBatch(await request.json());
    if (!batch) return noContent();

    const supabase = getServiceClient();
    if (!supabase) return noContent();

    const isStaging = Boolean(process.env.STAGING_PASSWORD);
    const { error } = await supabase.from("events").insert(
      batch.events.map((e) => ({
        session_id: batch.sessionId,
        type: e.type,
        label: e.label,
        path: e.path,
        meta: (e.meta as Json) ?? null,
        is_staging: isStaging,
      })),
    );
    if (error) console.error("[events] insert failed:", error.message);
  } catch (err) {
    console.error("[events] unexpected error:", err);
  }
  return noContent();
}
