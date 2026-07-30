import { industryShowcase } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Structured data for the industries showcase on /services.
 *
 * An ItemList rather than six loose ImageObjects: it says these photos are one
 * ordered set representing the industries .ppl supports, and gives each image a
 * name, caption, and description that `alt` alone cannot carry. `contentUrl` must
 * be absolute or consumers ignore it.
 *
 * Descriptions come from lib/content.ts and deliberately claim nothing beyond
 * "we support this industry" — inventing compliance or capability language for a
 * BPO provider would be a real misrepresentation, not a copy flourish.
 */
export function IndustriesSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Industries supported by .ppl Solutions, Inc.",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: industryShowcase.length,
    itemListElement: industryShowcase.map((industry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: industry.label,
      item: {
        "@type": "ImageObject",
        name: industry.label,
        caption: industry.alt,
        description: industry.description,
        contentUrl: `${site.url}${industry.image}`,
        representativeOfPage: false,
        creditText: site.name,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Server-rendered from a static module; no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
