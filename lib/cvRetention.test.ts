import { describe, it, expect } from "vitest";
import {
  DEFAULT_CV_RETENTION_DAYS,
  retentionDays,
  cutoffIso,
} from "@/lib/cvRetention";

describe("retentionDays", () => {
  it("defaults to the agreed 120 days", () => {
    expect(retentionDays(undefined)).toBe(DEFAULT_CV_RETENTION_DAYS);
    expect(DEFAULT_CV_RETENTION_DAYS).toBe(120);
  });

  it("accepts a configured override", () => {
    expect(retentionDays("30")).toBe(30);
  });

  it("falls back to the default rather than trusting a junk value", () => {
    // A typo'd env var must never widen the window to everything, and must
    // never evaluate to 0 — that would purge every CV on the next run.
    expect(retentionDays("abc")).toBe(DEFAULT_CV_RETENTION_DAYS);
    expect(retentionDays("")).toBe(DEFAULT_CV_RETENTION_DAYS);
    expect(retentionDays("0")).toBe(DEFAULT_CV_RETENTION_DAYS);
    expect(retentionDays("-5")).toBe(DEFAULT_CV_RETENTION_DAYS);
    expect(retentionDays("12.5")).toBe(DEFAULT_CV_RETENTION_DAYS);
  });
});

describe("cutoffIso", () => {
  it("returns the instant N days before now", () => {
    const now = new Date("2026-08-07T00:00:00.000Z");
    expect(cutoffIso(120, now)).toBe("2026-04-09T00:00:00.000Z");
  });

  it("is exclusive of anything newer, so today's CV is never in range", () => {
    const now = new Date("2026-08-07T00:00:00.000Z");
    const cutoff = new Date(cutoffIso(120, now));
    expect(cutoff.getTime()).toBeLessThan(now.getTime());
  });
});
