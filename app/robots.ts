import type { MetadataRoute } from "next";
import { CARD_CRAWLER_AGENTS } from "@/lib/crawlers";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com";

export default function robots(): MetadataRoute.Robots {
  // Staging deployments disallow everything; production uses the real rules.
  if (process.env.STAGING_PASSWORD) {
    return {
      rules: [
        // Card crawlers honour robots.txt, so the proxy.ts exemption alone
        // would never be exercised — they would not issue the request. A named
        // group replaces the `*` group entirely for that agent, and the longer
        // Allow wins over the shorter Disallow on these paths.
        ...CARD_CRAWLER_AGENTS.map((userAgent) => ({
          userAgent,
          allow: ["/blog/", "/careers/"],
          disallow: "/",
        })),
        { userAgent: "*", disallow: "/" },
      ],
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
