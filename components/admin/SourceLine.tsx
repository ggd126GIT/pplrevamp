import type { Json } from "@/lib/database.types";

/**
 * Where a lead came from, resolved at submit from its session's first page
 * view. Renders nothing for leads captured before attribution existed, rather
 * than showing an empty "Source: —" on every historic row.
 */
export function SourceLine({ attribution }: { attribution: Json | null }) {
  if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) {
    return null;
  }
  const a = attribution as Record<string, unknown>;
  const source = typeof a.source === "string" ? a.source : null;
  const landing = typeof a.landing_path === "string" ? a.landing_path : null;
  const views = typeof a.views === "number" ? a.views : null;
  const utm =
    a.utm && typeof a.utm === "object" && !Array.isArray(a.utm)
      ? (a.utm as Record<string, unknown>)
      : null;
  const campaign =
    utm && typeof utm.utm_campaign === "string" ? utm.utm_campaign : null;

  if (!source && !landing) return null;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal/60">
      <span>
        From <span className="font-semibold text-charcoal">{source ?? "unknown"}</span>
      </span>
      {campaign && <span>campaign {campaign}</span>}
      {landing && <span>landed on {landing}</span>}
      {views !== null && (
        <span>
          {views} page{views === 1 ? "" : "s"} viewed
        </span>
      )}
    </p>
  );
}
