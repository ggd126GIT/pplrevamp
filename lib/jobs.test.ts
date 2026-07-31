import { describe, expect, it } from "vitest";
import { acceptsApplications, isExpired, notExpiredFilter } from "./jobs";

const NOW = new Date("2026-08-15T12:00:00.000Z");

describe("isExpired", () => {
  it("treats a job with no expiry as never expiring", () => {
    expect(isExpired(null, NOW)).toBe(false);
    expect(isExpired(undefined, NOW)).toBe(false);
  });

  it("is false while the expiry is still in the future", () => {
    expect(isExpired("2026-08-15T15:59:59.999Z", NOW)).toBe(false);
  });

  it("is true once the expiry has passed", () => {
    expect(isExpired("2026-08-14T15:59:59.999Z", NOW)).toBe(true);
  });

  it("counts the exact instant as expired", () => {
    expect(isExpired("2026-08-15T12:00:00.000Z", NOW)).toBe(true);
  });

  it("hides a job whose expiry cannot be parsed", () => {
    // Unreachable from a timestamptz column, but failing closed is the safe
    // direction: better a hidden job than one taking applications it should not.
    expect(isExpired("nonsense", NOW)).toBe(true);
  });
});

describe("acceptsApplications", () => {
  it("accepts an open job with no expiry", () => {
    expect(acceptsApplications({ status: "open", expires_at: null }, NOW)).toBe(
      true,
    );
  });

  it("rejects a closed job even when the expiry is in the future", () => {
    expect(
      acceptsApplications(
        { status: "closed", expires_at: "2026-09-01T15:59:59.999Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects an open job whose expiry has passed", () => {
    expect(
      acceptsApplications(
        { status: "open", expires_at: "2026-08-14T15:59:59.999Z" },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("notExpiredFilter", () => {
  it("builds a PostgREST or-filter against the given instant", () => {
    expect(notExpiredFilter(NOW)).toBe(
      "expires_at.is.null,expires_at.gt.2026-08-15T12:00:00.000Z",
    );
  });
});
