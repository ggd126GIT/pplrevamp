import { afterEach, describe, expect, it } from "vitest";
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
  // The password prompt is off, so the gate restricts nobody and the per-path
  // allowlist would only suppress previews for pages outside /blog|/careers.
  it("lets card crawlers reach the whole site", () => {
    process.env.STAGING_PASSWORD = "secret";
    process.env.STAGING_PUBLIC = "1";
    expect(rulesFor("LinkedInBot")).toEqual({
      userAgent: "LinkedInBot",
      allow: "/",
    });
  });

  // This is the half that must NOT relax — it is the only reason the password
  // can come off without the client's staging box entering the index.
  it("still shuts search engines out entirely", () => {
    process.env.STAGING_PASSWORD = "secret";
    process.env.STAGING_PUBLIC = "1";
    expect(rulesFor("*")).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("has no effect once STAGING_PASSWORD is unset", () => {
    delete process.env.STAGING_PASSWORD;
    process.env.STAGING_PUBLIC = "1";
    expect(Array.isArray(robots().rules)).toBe(false);
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
