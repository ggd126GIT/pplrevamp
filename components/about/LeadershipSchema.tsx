import { leaders } from "@/lib/leadership";
import { site } from "@/lib/site";

/**
 * Person structured data for the leadership team, rendered once on /about.
 *
 * This is the half of image SEO that `alt` cannot do: it ties each portrait to a
 * named person, their job title, their employer, and their verified LinkedIn
 * profile, which is what lets a search engine treat the photo as *that person's*
 * image rather than a decorative one.
 *
 * `description` reuses the client-supplied first bio paragraph verbatim — the copy
 * in lib/leadership.ts is approved text and must not be paraphrased.
 */
export function LeadershipSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": leaders.map((leader) => ({
      "@type": "Person",
      name: leader.name,
      jobTitle: leader.title,
      description: leader.bio[0],
      // Absolute URL required — relative paths are ignored by consumers.
      image: `${site.url}${leader.photo}`,
      url: `${site.url}/about`,
      sameAs: [leader.linkedin],
      worksFor: {
        "@type": "Organization",
        name: site.name,
        url: site.url,
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
