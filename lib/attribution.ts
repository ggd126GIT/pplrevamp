import type { Json } from "@/lib/database.types";

/**
 * First-touch attribution for a lead.
 *
 * `page_views` has recorded source, utm, referrer and country since launch, and
 * `inquiries` has recorded `session_id` — so every lead could always be joined
 * back to what produced it. Nothing ever did the join, which is why "where do
 * our leads come from" had no answer. This resolves it once, at submit, and
 * stores the result on the lead.
 *
 * Deliberately FIRST touch. By the time someone submits, the referrer is this
 * site and the source reads "direct" — last-touch would attribute every lead to
 * the site itself. The question worth answering is what brought them here.
 *
 * Pure, so it can be tested: vitest runs `environment: "node"` and collects
 * only `**\/*.test.ts`.
 */

/** The subset of a `page_views` row this needs. */
export type TouchRow = {
  path: string;
  source: string | null;
  referrer: string | null;
  utm: Json | null;
  country: string | null;
  created_at: string;
};

export type Attribution = {
  source: string | null;
  referrer: string | null;
  utm: Json | null;
  country: string | null;
  landing_path: string;
  /** Views in the session before submitting — a rough engagement signal. */
  views: number;
};

export function firstTouch(rows: TouchRow[]): Attribution | null {
  if (!rows.length) return null;

  // Sort by timestamp, but keep rows whose timestamp will not parse: dropping
  // them could empty the list and lose the lead's origin entirely. They sort
  // last, so any usable row wins.
  const ordered = [...rows].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });

  const first = ordered[0];
  return {
    source: first.source ?? null,
    referrer: first.referrer ?? null,
    utm: first.utm ?? null,
    country: first.country ?? null,
    landing_path: first.path,
    views: rows.length,
  };
}
