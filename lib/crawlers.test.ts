import { describe, expect, it } from "vitest";
import { allowCardCrawler, isCardCrawler, isShareablePath } from "@/lib/crawlers";

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
    // Real emitted shapes: Next appends a hash suffix to the file-convention
    // image route, verified against the running server.
    "/blog/why-the-philippines-for-bpo/opengraph-image-1ejm5s",
    "/careers/project-manager/opengraph-image-1ejm5s",
  ])("allows %s", (path) => {
    expect(isShareablePath(path)).toBe(true);
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

describe("allowCardCrawler", () => {
  const fb = "facebookexternalhit/1.1";
  const post = "/blog/why-the-philippines-for-bpo";

  it("allows a card crawler fetching a post", () => {
    expect(allowCardCrawler("GET", post, fb)).toBe(true);
  });

  it("allows HEAD, which some crawlers send first", () => {
    expect(allowCardCrawler("HEAD", post, fb)).toBe(true);
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
