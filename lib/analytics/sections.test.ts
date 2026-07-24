import { describe, it, expect } from "vitest";
import {
  SECTION_REGISTRY,
  shouldFireSection,
  SECTION_DWELL_MS,
} from "@/lib/analytics/sections";

describe("shouldFireSection", () => {
  it("fires immediately once half the section is visible", () => {
    expect(shouldFireSection(0.5, 0)).toBe(true);
    expect(shouldFireSection(0.9, 0)).toBe(true);
  });

  it("fires on dwell even when barely visible", () => {
    expect(shouldFireSection(0.05, SECTION_DWELL_MS)).toBe(true);
  });

  it("does not fire on a fast scroll past", () => {
    expect(shouldFireSection(0.1, 200)).toBe(false);
    expect(shouldFireSection(0, 0)).toBe(false);
  });
});

describe("SECTION_REGISTRY", () => {
  it("covers the three tagged pages", () => {
    expect(Object.keys(SECTION_REGISTRY).sort()).toEqual([
      "/",
      "/about",
      "/services",
    ]);
  });

  it("uses unique keys within each page", () => {
    for (const defs of Object.values(SECTION_REGISTRY)) {
      const keys = defs.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
