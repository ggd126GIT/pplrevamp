import { describe, it, expect } from "vitest";
import { countryFlag, cityLabel, journeyLocation } from "@/lib/analytics/format";

describe("countryFlag", () => {
  it("maps a two-letter code to its regional-indicator emoji", () => {
    expect(countryFlag("PH")).toBe("🇵🇭");
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  it("returns empty string for null, the Unknown sentinel, or non-codes", () => {
    expect(countryFlag(null)).toBe("");
    expect(countryFlag("Unknown")).toBe("");
    expect(countryFlag("PHL")).toBe("");
  });
});

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
