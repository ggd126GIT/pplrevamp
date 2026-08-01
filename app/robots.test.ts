import { afterEach, describe, expect, it } from "vitest";
import robots from "@/app/robots";

const original = process.env.STAGING_PASSWORD;
afterEach(() => {
  if (original === undefined) delete process.env.STAGING_PASSWORD;
  else process.env.STAGING_PASSWORD = original;
});

function rulesFor(agent: string) {
  const { rules } = robots();
  const all = Array.isArray(rules) ? rules : [rules];
  return all.find((r) => r.userAgent === agent);
}

describe("robots on staging", () => {
  it("keeps everything else out", () => {
    process.env.STAGING_PASSWORD = "secret";
    expect(rulesFor("*")).toEqual({ userAgent: "*", disallow: "/" });
  });

  // Card crawlers honour robots.txt, so without a named group the proxy.ts
  // exemption would never be exercised.
  it.each(["facebookexternalhit", "LinkedInBot", "Twitterbot"])(
    "lets %s reach posts and jobs",
    (agent) => {
      process.env.STAGING_PASSWORD = "secret";
      expect(rulesFor(agent)).toEqual({
        userAgent: agent,
        allow: ["/blog/", "/careers/"],
        disallow: "/",
      });
    },
  );

  it("gives no crawler a sitemap on staging", () => {
    process.env.STAGING_PASSWORD = "secret";
    expect(robots().sitemap).toBeUndefined();
  });

  it("does not name a search engine", () => {
    process.env.STAGING_PASSWORD = "secret";
    const { rules } = robots();
    const agents = (Array.isArray(rules) ? rules : [rules]).map((r) => r.userAgent);
    expect(agents).not.toContain("Googlebot");
    expect(agents).not.toContain("bingbot");
  });
});

describe("robots in production", () => {
  // The exemption must leave no trace once the gate is off, or production
  // would carry per-agent groups that override the real allow-all rule.
  it("collapses to the single public rule", () => {
    delete process.env.STAGING_PASSWORD;
    const { rules } = robots();
    expect(Array.isArray(rules)).toBe(false);
    expect(rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api/", "/auth/"],
    });
  });
});
