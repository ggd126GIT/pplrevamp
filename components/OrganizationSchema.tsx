import { site } from "@/lib/site";

/**
 * Organization structured data, rendered once per page from the site layout.
 *
 * `logo` and `image` are the image-SEO half of this: they tell Google which
 * asset represents the brand in knowledge panels and rich results, which no
 * amount of `alt` text on a decorative hero can do. Both must be absolute URLs.
 */
export function OrganizationSchema() {
  const schema = {
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
      width: 133,
      height: 63,
    },
    image: {
      "@type": "ImageObject",
      url: `${site.url}/og/about.jpg`,
      width: 1200,
      height: 630,
    },
    email: site.email,
    telephone: site.phone,
    sameAs: [site.social.linkedin, site.social.facebook],
  };

  return (
    <script
      type="application/ld+json"
      // Server-rendered from a static object literal — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
