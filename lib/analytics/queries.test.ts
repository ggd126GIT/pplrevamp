import { describe, it, expect } from "vitest";
import { reachRows } from "@/lib/analytics/queries";

const DEFS = [
  { key: "hero", label: "Hero" },
  { key: "threeds", label: "3Ds framework" },
];

describe("reachRows", () => {
  it("computes reach percentages against session count", () => {
    expect(reachRows(DEFS, 50, new Map([["hero", 50], ["threeds", 19]]))).toEqual([
      { key: "hero", label: "Hero", reached: 50, pct: 100 },
      { key: "threeds", label: "3Ds framework", reached: 19, pct: 38 },
    ]);
  });

  it("reports zero for a section with no events, rather than omitting it", () => {
    expect(reachRows(DEFS, 10, new Map([["hero", 10]]))[1]).toEqual({
      key: "threeds",
      label: "3Ds framework",
      reached: 0,
      pct: 0,
    });
  });

  it("does not divide by zero when there are no sessions", () => {
    expect(reachRows(DEFS, 0, new Map())[0].pct).toBe(0);
  });

  it("clamps above 100 so a data anomaly cannot break the bar width", () => {
    expect(reachRows(DEFS, 5, new Map([["hero", 9]]))[0].pct).toBe(100);
  });
});
