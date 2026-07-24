import { createClient } from "@/lib/supabase/server";
import type { SectionDef } from "@/lib/analytics/sections";

export type AnalyticsSummary = {
  views: number;
  visitors: number;
  daily: Array<{ day: string; views: number }>;
  top_pages: Array<{ path: string; views: number }>;
  top_sources: Array<{ source: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
};

export type JourneyStep = {
  path: string;
  source: string | null;
  created_at: string;
};

/** Returns null on failure so a broken panel degrades instead of 500ing /admin. */
export async function getAnalyticsSummary(
  days: number,
): Promise<AnalyticsSummary | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("analytics_summary", { days });
    if (error) {
      console.error("[analytics] summary failed:", error.message);
      return null;
    }
    return data as unknown as AnalyticsSummary;
  } catch (err) {
    console.error("[analytics] summary threw:", err);
    return null;
  }
}

/** Ordered page views per session, keyed by session id. */
export async function getJourneys(
  sessionIds: string[],
): Promise<Map<string, JourneyStep[]>> {
  const journeys = new Map<string, JourneyStep[]>();
  if (!sessionIds.length) return journeys;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("page_views")
      .select("session_id, path, source, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[analytics] journeys failed:", error.message);
      return journeys;
    }

    for (const row of data ?? []) {
      const steps = journeys.get(row.session_id) ?? [];
      steps.push({
        path: row.path,
        source: row.source,
        created_at: row.created_at,
      });
      journeys.set(row.session_id, steps);
    }
  } catch (err) {
    console.error("[analytics] journeys threw:", err);
  }
  return journeys;
}

export type SectionReach = {
  sessions: Array<{ path: string; sessions: number }>;
  sections: Array<{ path: string; label: string; reached: number }>;
  clicks: Array<{ label: string; clicks: number }>;
};

export type ReachRow = {
  key: string;
  label: string;
  reached: number;
  pct: number;
};

/** Returns null on failure so a broken panel degrades instead of 500ing /admin. */
export async function getSectionReach(
  days: number,
): Promise<SectionReach | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("section_reach", { days });
    if (error) {
      console.error("[analytics] section reach failed:", error.message);
      return null;
    }
    return data as unknown as SectionReach;
  } catch (err) {
    console.error("[analytics] section reach threw:", err);
    return null;
  }
}

/**
 * Joins the declared registry to observed counts. Driven by `defs`, not by the
 * data, so a section nobody reached still appears — at 0%, which is the whole
 * point of the panel.
 */
export function reachRows(
  defs: SectionDef[],
  sessions: number,
  reached: Map<string, number>,
): ReachRow[] {
  return defs.map((def) => {
    const count = reached.get(def.key) ?? 0;
    return {
      key: def.key,
      label: def.label,
      reached: count,
      pct: sessions ? Math.min(100, Math.round((count / sessions) * 100)) : 0,
    };
  });
}
