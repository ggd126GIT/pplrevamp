import { afterEach, beforeEach, describe, expect, it } from "vitest";
import robots from "@/app/robots";

const original = process.env.STAGING_PASSWORD;
const originalPublic = process.env.STAGING_PUBLIC;
afterEach(() => {
  if (original === undefined) delete process.env.STAGING_PASSWORD;
  else process.env.STAGING_PASSWORD = original;
  if (originalPublic === undefined) delete process.env.STAGING_PUBLIC;
  else process.env.STAGING_PUBLIC = originalPublic;
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

describe("robots on public staging (STAGING_PUBLIC=1)", () => {
  beforeEach(() => {
    process.env.STAGING_PASSWORD = "secret";
    process.env.STAGING_PUBLIC = "1";
  });

  // The load-bearing assertion. Disallow blocks the FETCH, not the indexing:
  // a blocked Googlebot never receives the x-robots-tag: noindex header, and
  // can still list a bare URL discovered from an inbound social link. Allowing
  // the crawl is what makes the noindex directive reachable.
  it("allows the crawl so the noindex header can actually be read", () => {
    expect(rulesFor("*")).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api/", "/auth/", "/_next/"],
    });
  });

  // Those asset responses bypass the proxy matcher, so they carry no noindex
  // header of their own and must not be crawled.
  it("holds back /_next/ assets", () => {
    const rule = rulesFor("*");
    expect(rule?.disallow).toContain("/_next/");
  });

  it("still advertises no sitemap", () => {
    expect(robots().sitemap).toBeUndefined();
  });

  // Everyone is allowed here, so per-agent groups would be noise — and a named
  // group silently replaces the `*` group, which is how they would drift.
  it("emits no per-agent groups", () => {
    const { rules } = robots();
    expect(Array.isArray(rules)).toBe(false);
    expect(rulesFor("LinkedInBot")).toBeUndefined();
  });

  it("has no effect once STAGING_PASSWORD is unset", () => {
    delete process.env.STAGING_PASSWORD;
    expect(robots().sitemap).toBeDefined();
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
