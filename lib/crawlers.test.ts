import { describe, expect, it } from "vitest";
import {
  CARD_CRAWLER_AGENTS,
  allowCardCrawler,
  isCardCrawler,
  isCrawlerReadable,
  isShareablePath,
} from "@/lib/crawlers";

describe("isCardCrawler", () => {
  const real = {
    facebook:
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    linkedin:
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    x: "Twitterbot/1.0",
    slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    whatsapp: "WhatsApp/2.23.20.0 A",
    discord: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    telegram: "TelegramBot (like TwitterBot)",
  };

  for (const [network, ua] of Object.entries(real)) {
    it(`matches the real ${network} user-agent`, () => {
      expect(isCardCrawler(ua)).toBe(true);
    });
  }

  it("matches case-insensitively", () => {
    expect(isCardCrawler("linkedinbot/1.0")).toBe(true);
  });

  // The whole point of an allowlist is that search engines stay out. If
  // Googlebot ever matches, the staging site becomes indexable.
  it.each([
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
    ["Applebot", "Mozilla/5.0 (compatible; Applebot/0.1)"],
    ["a browser", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120"],
  ])("does not match %s", (_label, ua) => {
    expect(isCardCrawler(ua)).toBe(false);
  });

  it("treats a missing user-agent as not a crawler", () => {
    expect(isCardCrawler(null)).toBe(false);
    expect(isCardCrawler("")).toBe(false);
  });
});

describe("isShareablePath", () => {
  it.each([
    "/blog/why-the-philippines-for-bpo",
    "/careers/customer-service-associate",
    // Next appends a content-hash suffix to the file-convention image route.
    // This shape was read off the running server for /careers/project-manager;
    // each route has its own hash, so treat the suffix as opaque.
    "/careers/project-manager/opengraph-image-1ejm5s",
    "/blog/why-the-philippines-for-bpo/opengraph-image-fx5gi7",
    // A pasted trailing slash still reaches the page: the gate runs before
    // Next can redirect it.
    "/blog/why-the-philippines-for-bpo/",
  ])("allows %s", (path) => {
    expect(isShareablePath(path)).toBe(true);
  });

  // Anchored so a route added under [slug] later does not inherit the
  // exemption just by existing.
  it("refuses an unknown nested route under a record", () => {
    expect(isShareablePath("/blog/some-post/edit")).toBe(false);
    expect(isShareablePath("/careers/some-job/apply")).toBe(false);
  });

  // Only individual records are shareable. Widening this to the listing pages
  // or the rest of the site would hand out the whole staging build.
  it.each([
    "/",
    "/blog",
    "/blog/",
    "/careers",
    "/about",
    "/admin",
    "/admin/posts",
    "/login",
    "/api/track",
    "/contact",
  ])("refuses %s", (path) => {
    expect(isShareablePath(path)).toBe(false);
  });
});

describe("isCrawlerReadable", () => {
  // Without this the per-agent groups in app/robots.ts can never be read, and
  // these agents honour robots.txt — so the whole exemption goes unexercised.
  it("includes robots.txt", () => {
    expect(isCrawlerReadable("/robots.txt")).toBe(true);
  });

  it("does not widen beyond robots.txt and the records", () => {
    expect(isCrawlerReadable("/sitemap.xml")).toBe(false);
    expect(isCrawlerReadable("/")).toBe(false);
    expect(isCrawlerReadable("/admin")).toBe(false);
  });
});

describe("the two crawler lists cannot drift", () => {
  // A robots.txt group naming an agent the proxy refuses would advertise a URL
  // and then 401 it; an agent the proxy admits with no group never requests.
  it("admits every agent it advertises in robots.txt", () => {
    for (const agent of CARD_CRAWLER_AGENTS) {
      expect(isCardCrawler(agent)).toBe(true);
    }
  });

  it("advertises no search engine", () => {
    expect(CARD_CRAWLER_AGENTS as readonly string[]).not.toContain("Googlebot");
  });
});

describe("allowCardCrawler", () => {
  const fb = "facebookexternalhit/1.1";
  const post = "/blog/why-the-philippines-for-bpo";

  it("allows a card crawler fetching a post", () => {
    expect(allowCardCrawler("GET", post, fb)).toBe(true);
  });

  it("allows HEAD, which some crawlers send first", () => {
    expect(allowCardCrawler("HEAD", post, fb)).toBe(true);
  });

  it("lets a card crawler read robots.txt", () => {
    expect(allowCardCrawler("GET", "/robots.txt", fb)).toBe(true);
  });

  it("still refuses a browser on robots.txt", () => {
    expect(allowCardCrawler("GET", "/robots.txt", "Mozilla/5.0 Chrome/120")).toBe(
      false,
    );
  });

  // A crawler UA is trivially forged, so the exemption must never carry a
  // request that could change state.
  it.each(["POST", "PUT", "PATCH", "DELETE"])("refuses %s", (method) => {
    expect(allowCardCrawler(method, post, fb)).toBe(false);
  });

  it("refuses a card crawler outside the shareable paths", () => {
    expect(allowCardCrawler("GET", "/admin/posts", fb)).toBe(false);
    expect(allowCardCrawler("GET", "/", fb)).toBe(false);
  });

  it("refuses a browser on a shareable path", () => {
    expect(allowCardCrawler("GET", post, "Mozilla/5.0 Chrome/120")).toBe(false);
  });
});
