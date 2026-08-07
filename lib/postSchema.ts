/**
 * BlogPosting structured data. Pure object building with no DOM access, kept
 * out of the component so vitest (which runs `environment: "node"` and only
 * collects `**\/*.test.ts`) can cover the conditional branches — the same
 * reasoning as `lib/jobSchema.ts`.
 *
 * Posts previously carried NO structured data of any kind, so Google could not
 * read a post's headline, author or date however carefully an editor set them.
 * The blog is the site's only real play for non-brand search visibility, which
 * made this the highest-value SEO gap in the project.
 *
 * Nothing here is invented. A post with no cover image emits no `image` rather
 * than borrowing the listing's placeholder, and a post with no date emits no
 * date rather than a guessed one — the same rule that keeps `baseSalary` out of
 * the job schema.
 */
import { site } from "@/lib/site";
import { absoluteUrl } from "@/lib/share";

export type PostForSchema = {
  slug: string;
  title: string;
  excerpt: string | null;
  byline: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function blogPostingSchema(post: PostForSchema): Record<string, unknown> {
  const url = absoluteUrl(`/blog/${post.slug}`);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    // Emitted verbatim so it matches the visible <h1>. Google prefers headlines
    // under ~110 characters, but a truncated headline that disagrees with the
    // page is a worse signal than a long one that matches.
    headline: post.title,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // A byline is free text an editor typed, so it is credited as a Person
    // without inventing a profile URL. Unattributed posts fall to the company
    // rather than going without an author, which Google flags.
    author: post.byline
      ? { "@type": "Person", name: post.byline }
      : { "@type": "Organization", name: site.name, url: site.url },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: { "@type": "ImageObject", url: `${site.url}/ppl-logo.png` },
    },
  };

  // The editor's publication date wins over the row's creation time — the same
  // precedence the visible date uses, so the two can never disagree.
  const datePublished = post.published_at ?? post.created_at;
  if (datePublished) {
    schema.datePublished = datePublished;
    // A never-edited post is unmodified since publication; saying so beats
    // omitting the field, which reads as unknown freshness.
    schema.dateModified = post.updated_at ?? datePublished;
  }

  // Uploads already store an absolute Supabase URL; routing it through
  // absoluteUrl leaves those untouched and still copes with a relative path.
  if (post.cover_image_url) schema.image = absoluteUrl(post.cover_image_url);

  // Excerpts are stored with real line breaks for display. JSON-LD accepts
  // them, but a single line is what every consumer actually shows.
  const description = post.excerpt?.replace(/\s+/g, " ").trim();
  if (description) schema.description = description;

  return schema;
}
