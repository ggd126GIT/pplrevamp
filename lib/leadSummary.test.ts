import { describe, expect, it } from "vitest";
import { summariseLeads, topSources } from "./leadSummary";

describe("summariseLeads", () => {
  it("reads as nothing-yet when there are no leads", () => {
    expect(summariseLeads([])).toEqual({ total: 0, unanswered: 0, won: 0 });
  });

  // "Unanswered" is the number that matters day to day: a lead nobody has
  // touched is the one that gets lost.
  it("counts anything still 'new' as unanswered", () => {
    const out = summariseLeads([
      { status: "new" },
      { status: "new" },
      { status: "contacted" },
      { status: "won" },
      { status: "lost" },
    ]);
    expect(out).toEqual({ total: 5, unanswered: 2, won: 1 });
  });

  it("treats an unrecognised status as answered, not unanswered", () => {
    expect(summariseLeads([{ status: "archived" }]).unanswered).toBe(0);
  });
});

describe("topSources", () => {
  const lead = (source: string | null) => ({ attribution: source === null ? null : { source } });

  it("ranks sources by how many leads each produced", () => {
    expect(
      topSources([lead("google"), lead("linkedin"), lead("google")]),
    ).toEqual([
      { source: "google", count: 2 },
      { source: "linkedin", count: 1 },
    ]);
  });

  it("buckets leads with no attribution as unknown", () => {
    expect(topSources([lead(null), lead(null)])).toEqual([
      { source: "unknown", count: 2 },
    ]);
  });

  it("limits the list so the summary stays a sentence", () => {
    const leads = ["a", "b", "c", "d", "e"].flatMap((s) => [lead(s)]);
    expect(topSources(leads, 3)).toHaveLength(3);
  });

  it("survives attribution that is not the shape we expect", () => {
    expect(topSources([{ attribution: "nonsense" }, { attribution: {} }])).toEqual([
      { source: "unknown", count: 2 },
    ]);
  });

  it("returns nothing for no leads", () => {
    expect(topSources([])).toEqual([]);
  });
});
