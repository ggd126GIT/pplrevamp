import { describe, it, expect } from "vitest";
import { placeLabel, journeyLocation } from "@/lib/analytics/format";

describe("placeLabel", () => {
  it("appends the country code when present", () => {
    expect(placeLabel("Makati", "PH")).toBe("Makati, PH");
  });

  it("returns the bare value when country is null", () => {
    expect(placeLabel("Makati", null)).toBe("Makati");
  });
});

describe("journeyLocation", () => {
  it("prefers city + country", () => {
    expect(journeyLocation("Sydney", "AU")).toBe("Sydney, AU");
  });

  it("falls back to country alone, then to null", () => {
    expect(journeyLocation(null, "AU")).toBe("AU");
    expect(journeyLocation(null, null)).toBeNull();
  });
});
