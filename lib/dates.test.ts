import { describe, expect, it } from "vitest";
import { manilaEndOfDay, toDateInput } from "./dates";

describe("manilaEndOfDay", () => {
  it("maps a date to the last instant of that day in Manila", () => {
    // 23:59:59.999+08:00 is 15:59:59.999Z the same day.
    expect(manilaEndOfDay("2026-08-15")).toBe("2026-08-15T15:59:59.999Z");
  });

  it("returns null for a blank field, meaning no expiry", () => {
    expect(manilaEndOfDay("")).toBeNull();
    expect(manilaEndOfDay("   ")).toBeNull();
  });

  it("returns undefined for malformed input so a typo is not read as cleared", () => {
    expect(manilaEndOfDay("garbage")).toBeUndefined();
    expect(manilaEndOfDay("15/08/2026")).toBeUndefined();
    expect(manilaEndOfDay("2026-13-40")).toBeUndefined();
    expect(manilaEndOfDay("2026-02-30")).toBeUndefined();
  });
});

describe("toDateInput", () => {
  it("reads the stored instant back as the Manila calendar date", () => {
    // The instant falls on 15 Aug in UTC and 15 Aug in Manila.
    expect(toDateInput("2026-08-15T15:59:59.999Z")).toBe("2026-08-15");
  });

  it("uses the Manila date when UTC is still on the previous day", () => {
    // 16:30Z on 14 Aug is 00:30 on 15 Aug in Manila.
    expect(toDateInput("2026-08-14T16:30:00.000Z")).toBe("2026-08-15");
  });

  it("round-trips a value produced by manilaEndOfDay", () => {
    expect(toDateInput(manilaEndOfDay("2026-12-31") as string)).toBe(
      "2026-12-31",
    );
  });

  it("returns an empty string for null or unparseable input", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
    expect(toDateInput("not a date")).toBe("");
  });
});
