import type { MetadataRoute } from "next";
import { CARD_CRAWLER_AGENTS } from "@/lib/crawlers";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com";

export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING_PASSWORD) {
    // Publicly readable staging that is being linked to from social posts.
    //
    // Counterintuitively this must ALLOW the crawl. `Disallow` stops the
    // fetch, not the indexing — a blocked Googlebot never receives the page,
    // so it never sees the `x-robots-tag: noindex` header, and it can still
    // list the bare URL it discovered from an inbound link. Letting it fetch
    // is what makes the noindex directive reachable and the exclusion real.
    //
    // `/_next/` is held back because those asset responses bypass the proxy
    // matcher and so carry no noindex header of their own.
    if (process.env.STAGING_PUBLIC === "1") {
      return {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/login", "/api/", "/auth/", "/_next/"],
        },
        // No sitemap: nothing should actively advertise staging URLs.
      };
    }

    // Password-gated staging. Nothing can be fetched without the credential
    // and there are no public inbound links, so a blanket Disallow is right.
    // Card crawlers honour robots.txt, so they get named groups — without them
    // the proxy.ts gate exemption would never be exercised, because they would
    // not issue the request at all. A named group replaces the `*` group for
    // that agent, and the longer Allow wins over the shorter Disallow.
    return {
      rules: [
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
