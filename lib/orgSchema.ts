/**
 * Organization structured data. Pure object building, kept out of the component
 * so vitest (`environment: "node"`, `**\/*.test.ts` only) can assert it — the
 * same split as `lib/jobSchema.ts` and `lib/postSchema.ts`.
 *
 * `logo` and `image` are the image-SEO half of this: they tell Google which
 * asset represents the brand in knowledge panels and rich results, which no
 * amount of `alt` text on a decorative hero can do. Both must be absolute URLs.
 *
 * `address` matters more here than it looks. Almost every Search Console
 * impression this domain gets is brand confusion with *PPL Electric Utilities*,
 * a large US energy company, and none of it will ever convert. A Pasig,
 * Philippines address on the Organization entity is a hard signal that this is
 * a different organisation in a different country.
 */
import { site } from "@/lib/site";

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    description:
      "A BPO solutions provider offering bespoke offshoring and outsourcing services across front-office and back-office functions.",
    logo: {
      "@type": "ImageObject",
      url: `${site.url}/ppl-logo.png`,
      // Must match the file the pipeline emits from ppl-logo.svg — 2x the
      // 133x63 CSS box. Update both together if that render size changes.
      width: 266,
      height: 126,
    },
    image: {
      "@type": "ImageObject",
      url: `${site.url}/og/about.jpg`,
      width: 1200,
      height: 630,
    },
    email: site.email,
    telephone: site.phone,
    // Built from `site.address`, never hardcoded: the same constant renders on
    // the privacy policy and as the `jobLocation` of every on-site or hybrid
    // role, and three copies of an address drift.
    address: {
      "@type": "PostalAddress",
      streetAddress: `${site.address.street}, ${site.address.district}`,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    sameAs: [site.social.linkedin, site.social.facebook],
  };
}
