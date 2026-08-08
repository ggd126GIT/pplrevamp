import { describe, expect, it } from "vitest";
import {
  formatManilaDate,
  manilaDateTime,
  manilaEndOfDay,
  manilaStartOfDay,
  toDateInput,
  toDateTimeInput,
} from "./dates";

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

describe("manilaDateTime", () => {
  it("reads the input as Manila wall-clock time", () => {
    // 09:30 in Manila is 01:30Z the same day.
    expect(manilaDateTime("2026-08-15T09:30")).toBe("2026-08-15T01:30:00.000Z");
  });

  it("rolls back to the previous UTC day for an early-morning Manila time", () => {
    // 00:30 on 15 Aug in Manila is 16:30Z on 14 Aug.
    expect(manilaDateTime("2026-08-15T00:30")).toBe("2026-08-14T16:30:00.000Z");
  });

  it("accepts the seconds some browsers append", () => {
    expect(manilaDateTime("2026-08-15T09:30:45")).toBe(
      "2026-08-15T01:30:45.000Z",
    );
  });

  it("returns null for a blank field", () => {
    expect(manilaDateTime("")).toBeNull();
    expect(manilaDateTime("   ")).toBeNull();
  });

  it("returns undefined for malformed input so a typo is not read as cleared", () => {
    expect(manilaDateTime("garbage")).toBeUndefined();
    // A bare date is not a datetime — the input never submits this shape.
    expect(manilaDateTime("2026-08-15")).toBeUndefined();
    expect(manilaDateTime("2026-02-30T09:30")).toBeUndefined();
    expect(manilaDateTime("2026-08-15T25:30")).toBeUndefined();
    expect(manilaDateTime("2026-08-15T09:75")).toBeUndefined();
  });
});

describe("toDateTimeInput", () => {
  it("reads the stored instant back as Manila wall-clock time", () => {
    expect(toDateTimeInput("2026-08-15T01:30:00.000Z")).toBe("2026-08-15T09:30");
  });

  it("uses the Manila date when UTC is still on the previous day", () => {
    expect(toDateTimeInput("2026-08-14T16:30:00.000Z")).toBe("2026-08-15T00:30");
  });

  it("round-trips a value produced by manilaDateTime", () => {
    expect(toDateTimeInput(manilaDateTime("2026-12-31T23:59") as string)).toBe(
      "2026-12-31T23:59",
    );
  });

  it("returns an empty string for null or unparseable input", () => {
    expect(toDateTimeInput(null)).toBe("");
    expect(toDateTimeInput(undefined)).toBe("");
    expect(toDateTimeInput("not a date")).toBe("");
  });
});

describe("formatManilaDate", () => {
  it("formats the reader-facing long date", () => {
    expect(formatManilaDate("2026-08-04T06:00:00.000Z")).toBe("August 4, 2026");
  });

  it("does not slip a day back on a UTC server", () => {
    // 01:00 on 5 Aug in Manila is 17:00Z on 4 Aug. A server reading its own
    // clock in UTC would render this as August 4.
    expect(formatManilaDate("2026-08-04T17:00:00.000Z")).toBe("August 5, 2026");
  });

  it("handles the last instant of a Manila year", () => {
    expect(formatManilaDate(manilaEndOfDay("2026-12-31") as string)).toBe(
      "December 31, 2026",
    );
  });

  it("returns an empty string for null or unparseable input", () => {
    expect(formatManilaDate(null)).toBe("");
    expect(formatManilaDate(undefined)).toBe("");
    expect(formatManilaDate("not a date")).toBe("");
  });
});

describe("manilaStartOfDay", () => {
  it("is the first instant of that Manila day, in UTC", () => {
    // 00:00 on 7 Aug in Manila is 16:00 on 6 Aug UTC.
    expect(manilaStartOfDay("2026-08-07")).toBe("2026-08-06T16:00:00.000Z");
  });

  it("pairs with manilaEndOfDay to cover exactly one day", () => {
    const start = manilaStartOfDay("2026-08-07") as string;
    const end = manilaEndOfDay("2026-08-07") as string;
    expect(Date.parse(end) - Date.parse(start)).toBe(86_400_000 - 1);
  });

  // An application submitted at 00:30 Manila is 16:30 the PREVIOUS UTC day.
  // Comparing against the bare date string would drop it.
  it("includes an application made just after midnight Manila", () => {
    const start = manilaStartOfDay("2026-08-07") as string;
    expect(Date.parse("2026-08-06T16:30:00Z")).toBeGreaterThan(Date.parse(start));
  });

  it("returns null for blank (no bound) and undefined for a typo", () => {
    expect(manilaStartOfDay("")).toBeNull();
    expect(manilaStartOfDay("   ")).toBeNull();
    expect(manilaStartOfDay("2026-13-01")).toBeUndefined();
    expect(manilaStartOfDay("07/08/2026")).toBeUndefined();
  });

  it("rejects a day that does not exist", () => {
    expect(manilaStartOfDay("2026-02-30")).toBeUndefined();
  });
});
