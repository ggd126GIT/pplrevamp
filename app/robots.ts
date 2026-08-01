import type { MetadataRoute } from "next";
import { CARD_CRAWLER_AGENTS } from "@/lib/crawlers";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com";

export default function robots(): MetadataRoute.Robots {
  // Staging deployments disallow everything; production uses the real rules.
  if (process.env.STAGING_PASSWORD) {
    // Card crawlers honour robots.txt, so the proxy.ts gate exemption alone
    // would never be exercised — they would not issue the request. A named
    // group replaces the `*` group entirely for that agent, and the longer
    // Allow wins over the shorter Disallow on these paths.
    //
    // With STAGING_PUBLIC the prompt is off and the gate restricts nobody, so
    // the per-path allowlist that mirrored it would serve only to suppress
    // previews for pages outside /blog and /careers. Widen it to the site.
    const cardCrawlerRules = CARD_CRAWLER_AGENTS.map((userAgent) =>
      process.env.STAGING_PUBLIC === "1"
        ? { userAgent, allow: "/" }
        : { userAgent, allow: ["/blog/", "/careers/"], disallow: "/" },
    );

    return {
      // Search engines stay in the `*` group and remain fully disallowed, on
      // top of the `x-robots-tag: noindex` header set in proxy.ts.
      rules: [...cardCrawlerRules, { userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api/", "/auth/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
