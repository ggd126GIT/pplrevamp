/**
 * Lead funnel shaping. Pure arithmetic with no DOM or database access, kept out
 * of the component so vitest (which runs `environment: "node"` and only collects
 * `**\/*.test.ts`) can cover the awkward cases — chiefly a zero denominator,
 * which is the normal state of a funnel on a new site.
 */

export type FunnelCounts = {
  sessions: number;
  reached: number;
  started: number;
  submitted: number;
};

export type FunnelBySource = FunnelCounts & { source: string };

export type LeadFunnel = {
  total: FunnelCounts;
  by_source: FunnelBySource[];
};

export type FunnelStage = {
  key: keyof FunnelCounts;
  label: string;
  hint: string;
  count: number;
  /** Share of all sessions, 0–100. */
  pctOfSessions: number;
  /** Share of the previous stage, 0–100. Null for the first stage. */
  pctOfPrev: number | null;
};

const STAGES: Array<{ key: keyof FunnelCounts; label: string; hint: string }> = [
  { key: "sessions", label: "Visits", hint: "Distinct sessions in the period" },
  {
    key: "reached",
    label: "Reached the contact page",
    hint: "Sessions that opened /contact",
  },
  {
    key: "started",
    label: "Started filling a form",
    hint: "Typed into a field — focus alone does not count",
  },
  {
    key: "submitted",
    label: "Submitted an enquiry",
    hint: "Became a lead in the inbox",
  },
];

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

/**
 * Turn raw counts into display rows.
 *
 * Both percentages are shown because they answer different questions: share of
 * sessions says how much of the audience got here, share of the previous stage
 * says where people are actually being lost.
 */
export function funnelStages(counts: FunnelCounts): FunnelStage[] {
  return STAGES.map((stage, i) => {
    const count = counts[stage.key];
    const prev = i === 0 ? null : counts[STAGES[i - 1].key];
    return {
      ...stage,
      count,
      pctOfSessions: pct(count, counts.sessions),
      pctOfPrev: prev === null ? null : pct(count, prev),
    };
  });
}

/**
 * The single biggest drop between consecutive stages — the thing worth fixing
 * next. Null when there is no traffic at all, or when nothing has been lost.
 */
export function biggestDrop(
  counts: FunnelCounts,
): { from: string; to: string; lost: number } | null {
  const stages = funnelStages(counts);
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < stages.length; i++) {
    const lost = stages[i - 1].count - stages[i].count;
    if (lost > 0 && (!worst || lost > worst.lost)) {
      worst = { from: stages[i - 1].label, to: stages[i].label, lost };
    }
  }
  return worst;
}
