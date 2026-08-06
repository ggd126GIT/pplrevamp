import { describe, expect, it } from "vitest";
import { funnelStages, biggestDrop, type FunnelCounts } from "./funnel";

const counts = (o: Partial<FunnelCounts> = {}): FunnelCounts => ({
  sessions: 0,
  reached: 0,
  started: 0,
  submitted: 0,
  ...o,
});

describe("funnelStages", () => {
  it("returns the four stages in order", () => {
    expect(funnelStages(counts()).map((s) => s.key)).toEqual([
      "sessions",
      "reached",
      "started",
      "submitted",
    ]);
  });

  it("computes share of sessions and share of the previous stage", () => {
    const s = funnelStages(
      counts({ sessions: 100, reached: 20, started: 10, submitted: 5 }),
    );
    expect(s[1]).toMatchObject({ count: 20, pctOfSessions: 20, pctOfPrev: 20 });
    // 10 of 20 is half the previous stage but only a tenth of all sessions —
    // the two numbers disagreeing is exactly why both are shown.
    expect(s[2]).toMatchObject({ count: 10, pctOfSessions: 10, pctOfPrev: 50 });
    expect(s[3]).toMatchObject({ count: 5, pctOfSessions: 5, pctOfPrev: 50 });
  });

  it("has no previous stage for the first row", () => {
    expect(funnelStages(counts({ sessions: 10 }))[0].pctOfPrev).toBeNull();
  });

  // The normal state of a new site, and the one that divides by zero.
  it("survives a funnel with no traffic at all", () => {
    const s = funnelStages(counts());
    expect(s.every((x) => x.pctOfSessions === 0)).toBe(true);
    expect(s.slice(1).every((x) => x.pctOfPrev === 0)).toBe(true);
  });

  it("does not divide by zero when a middle stage is empty", () => {
    const s = funnelStages(counts({ sessions: 50, reached: 0, started: 0 }));
    expect(s[2].pctOfPrev).toBe(0);
    expect(Number.isNaN(s[2].pctOfPrev as number)).toBe(false);
  });
});

describe("biggestDrop", () => {
  it("names the stage pair losing the most people", () => {
    expect(
      biggestDrop(counts({ sessions: 100, reached: 20, started: 18, submitted: 2 })),
    ).toMatchObject({ lost: 80 });
  });

  it("prefers the larger absolute loss, not the larger percentage", () => {
    // 100→20 loses 80; 20→2 loses 18 but is a steeper percentage fall. The
    // bigger population is the better place to spend effort.
    const drop = biggestDrop(
      counts({ sessions: 100, reached: 20, started: 20, submitted: 2 }),
    );
    expect(drop?.from).toBe("Visits");
    expect(drop?.to).toBe("Reached the contact page");
  });

  it("returns null when nothing is lost", () => {
    expect(
      biggestDrop(counts({ sessions: 5, reached: 5, started: 5, submitted: 5 })),
    ).toBeNull();
  });

  it("returns null on an empty funnel rather than inventing a finding", () => {
    expect(biggestDrop(counts())).toBeNull();
  });
});
