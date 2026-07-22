import { createClient } from "@/lib/supabase/server";

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
