import type { Json } from "@/lib/database.types";

/**
 * The one-sentence answer the admin needs: how many leads, where from, and how
 * many nobody has touched.
 *
 * A wall of charts is not the goal — with a handful of leads a month the useful
 * output is a sentence you can read in two seconds and act on.
 *
 * Pure, so it can be tested: vitest runs `environment: "node"` here.
 */

export type LeadStatusRow = { status: string };
export type LeadAttributionRow = { attribution: Json | null };

export type LeadSummary = {
  total: number;
  /** Still `new` — nobody has picked it up. The number worth reacting to. */
  unanswered: number;
  won: number;
};

export function summariseLeads(rows: LeadStatusRow[]): LeadSummary {
  let unanswered = 0;
  let won = 0;
  for (const r of rows) {
    if (r.status === "new") unanswered++;
    else if (r.status === "won") won++;
  }
  return { total: rows.length, unanswered, won };
}

/**
 * Lead counts per first-touch source, biggest first.
 *
 * Anything without usable attribution buckets as "unknown" rather than being
 * dropped — a source you cannot see is exactly the thing you need told about,
 * and silently omitting those rows would make the totals lie.
 */
export function topSources(
  rows: LeadAttributionRow[],
  limit = 5,
): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const a = r.attribution;
    const source =
      a && typeof a === "object" && !Array.isArray(a) && typeof a.source === "string" && a.source
        ? a.source
        : "unknown";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
    .slice(0, limit);
}
