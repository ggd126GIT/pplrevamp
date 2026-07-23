import { describe, it, expect } from "vitest";
import {
  countryFromHeaders,
  isBot,
  deviceFromUserAgent,
  referrerHost,
  deriveSource,
  sanitizePath,
  extractUtm,
  isUuid,
} from "@/lib/analytics/parse";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

describe("isBot", () => {
  it("treats a missing or empty user-agent as a bot", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("   ")).toBe(true);
  });

  it("flags known crawlers and headless clients", () => {
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/120.0")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("python-requests/2.31.0")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("passes real browsers through", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });
});

describe("deviceFromUserAgent", () => {
  it("classifies desktop", () => {
    expect(deviceFromUserAgent(CHROME)).toBe("desktop");
  });

  it("classifies phones", () => {
    expect(deviceFromUserAgent(IPHONE)).toBe("mobile");
  });

  it("classifies tablets, including Android tablets lacking the Mobile token", () => {
    expect(deviceFromUserAgent(IPAD)).toBe("tablet");
    expect(deviceFromUserAgent(ANDROID_TABLET)).toBe("tablet");
  });

  it("falls back to desktop when the user-agent is absent", () => {
    expect(deviceFromUserAgent(null)).toBe("desktop");
  });
});

describe("referrerHost", () => {
  it("returns null for same-site navigation, ignoring the www prefix", () => {
    expect(
      referrerHost("https://www.pplsolutionsinc.com/about", "pplsolutionsinc.com"),
    ).toBeNull();
  });

  it("returns the external host", () => {
    expect(referrerHost("https://www.google.com/search?q=x", "pplsolutionsinc.com")).toBe(
      "www.google.com",
    );
  });

  it("returns null for absent or malformed referrers", () => {
    expect(referrerHost(null, "pplsolutionsinc.com")).toBeNull();
    expect(referrerHost("not a url", "pplsolutionsinc.com")).toBeNull();
  });
});

describe("deriveSource", () => {
  it("defaults to direct with no referrer", () => {
    expect(deriveSource(null)).toBe("direct");
  });

  it("maps known hosts to channel names", () => {
    expect(deriveSource("www.google.com")).toBe("google");
    expect(deriveSource("www.google.co.uk")).toBe("google");
    expect(deriveSource("www.linkedin.com")).toBe("linkedin");
    expect(deriveSource("lnkd.in")).toBe("linkedin");
    expect(deriveSource("m.facebook.com")).toBe("facebook");
  });

  it("falls back to the bare host for unknown referrers", () => {
    expect(deriveSource("www.someblog.dev")).toBe("someblog.dev");
  });

  it("lets an explicit utm_source win over the referrer", () => {
    expect(deriveSource("www.google.com", "newsletter")).toBe("newsletter");
  });

  it("ignores a blank utm_source", () => {
    expect(deriveSource("www.google.com", "  ")).toBe("google");
  });

  it("rejects phishing hosts that start with a known search engine domain", () => {
    // Regression: the old regex /(^|\.)google\./ would match "google.attacker-phishing.com"
    expect(deriveSource("google.attacker-phishing.com")).toBe("google.attacker-phishing.com");
    expect(deriveSource("bing.evil.net")).toBe("bing.evil.net");
  });

  it("handles mixed-case hosts by lowercasing them", () => {
    expect(deriveSource("WWW.GOOGLE.COM")).toBe("google");
    expect(deriveSource("Www.Linkedin.Com")).toBe("linkedin");
  });
});

describe("sanitizePath", () => {
  it("strips query and hash", () => {
    expect(sanitizePath("/services?utm_source=x#top")).toBe("/services");
  });

  it("rejects non-strings and anything not rooted at /", () => {
    expect(sanitizePath(42)).toBeNull();
    expect(sanitizePath("https://evil.com/x")).toBeNull();
    expect(sanitizePath("")).toBeNull();
  });

  it("caps absurdly long paths", () => {
    expect(sanitizePath("/" + "a".repeat(900))?.length).toBe(512);
  });
});

describe("extractUtm", () => {
  it("picks out only utm_ params", () => {
    expect(extractUtm("?utm_source=li&utm_campaign=q3&foo=bar")).toEqual({
      utm_source: "li",
      utm_campaign: "q3",
    });
  });

  it("returns null when there are none", () => {
    expect(extractUtm("?foo=bar")).toBeNull();
    expect(extractUtm("")).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts a v4 uuid and rejects anything else", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("nope")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe("countryFromHeaders", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("prefers the Vercel header", () => {
    expect(
      countryFromHeaders(h({ "x-vercel-ip-country": "PH", "cf-ipcountry": "US" })),
    ).toBe("PH");
  });

  it("falls back to Cloudflare then Nginx GeoIP off Vercel", () => {
    expect(countryFromHeaders(h({ "cf-ipcountry": "sg" }))).toBe("SG");
    expect(countryFromHeaders(h({ "x-geoip-country": "AU" }))).toBe("AU");
  });

  it("returns null when no edge resolved a country", () => {
    expect(countryFromHeaders(h({}))).toBeNull();
    expect(countryFromHeaders(h({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(countryFromHeaders(h({ "cf-ipcountry": "T1" }))).toBeNull();
    expect(countryFromHeaders(h({ "x-vercel-ip-country": "PHL" }))).toBeNull();
  });

  it("skips an unusable header and keeps looking", () => {
    expect(
      countryFromHeaders(h({ "x-vercel-ip-country": "XX", "cf-ipcountry": "PH" })),
    ).toBe("PH");
  });
});
