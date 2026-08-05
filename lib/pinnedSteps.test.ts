import { describe, expect, it } from "vitest";
import { activeStep, stepScrollTop } from "./pinnedSteps";

describe("stepScrollTop", () => {
  it("maps timeline progress onto the trigger's scroll range", () => {
    expect(stepScrollTop(1000, 5000, 0)).toBe(1000);
    expect(stepScrollTop(1000, 5000, 0.5)).toBe(3000);
    expect(stepScrollTop(1000, 5000, 1)).toBe(5000);
  });

  it("rounds to a whole pixel", () => {
    expect(stepScrollTop(0, 3000, 1 / 3)).toBe(1000);
    expect(Number.isInteger(stepScrollTop(0, 999, 0.517))).toBe(true);
  });

  // A caller reading progress off a live timeline can hand us anything.
  it("clamps out-of-range progress into the pinned span", () => {
    expect(stepScrollTop(1000, 5000, -0.4)).toBe(1000);
    expect(stepScrollTop(1000, 5000, 2)).toBe(5000);
  });

  // end === start happens before ScrollTrigger has measured, and on a viewport
  // too short to pin. Must not produce NaN.
  it("survives a zero-length range", () => {
    expect(stepScrollTop(800, 800, 0.5)).toBe(800);
  });
});

describe("activeStep", () => {
  const points = [0.18, 0.48, 0.87];

  it("picks the nearest snap point", () => {
    expect(activeStep(0, points)).toBe(0);
    expect(activeStep(0.2, points)).toBe(0);
    expect(activeStep(0.47, points)).toBe(1);
    expect(activeStep(0.9, points)).toBe(2);
    expect(activeStep(1, points)).toBe(2);
  });

  it("resolves a midpoint to the earlier step, not an arbitrary one", () => {
    expect(activeStep((0.18 + 0.48) / 2, points)).toBe(0);
  });

  it("returns 0 when there are no points to choose between", () => {
    expect(activeStep(0.5, [])).toBe(0);
  });
});
