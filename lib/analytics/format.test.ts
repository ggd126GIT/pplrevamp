import { describe, it, expect } from "vitest";
import { cityLabel, journeyLocation } from "@/lib/analytics/format";

describe("cityLabel", () => {
  it("appends the country code when present", () => {
    expect(cityLabel("Makati", "PH")).toBe("Makati, PH");
  });

  it("returns the bare city when country is null", () => {
    expect(cityLabel("Makati", null)).toBe("Makati");
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
