import { describe, it, expect } from "vitest";
import { blogPostingSchema, type PostForSchema } from "@/lib/postSchema";
import { site } from "@/lib/site";

const base: PostForSchema = {
  slug: "customer-success-in-bpo-a-global-challenge",
  title: "Customer Success in BPO: A Global Challenge",
  excerpt: "The BPO industry is evolving.",
  byline: "Joey Lianko",
  cover_image_url:
    "https://ebnjvbppgcifxrcqozhj.supabase.co/storage/v1/object/public/blog-images/cover.jpg",
  published_at: "2024-12-09T00:00:00Z",
  created_at: "2026-08-04T14:03:14.026Z",
  updated_at: "2026-08-06T14:44:04.295Z",
};

describe("blogPostingSchema", () => {
  it("emits a BlogPosting identified by its canonical public URL", () => {
    const s = blogPostingSchema(base);

    expect(s["@type"]).toBe("BlogPosting");
    expect(s.headline).toBe("Customer Success in BPO: A Global Challenge");
    expect(s.url).toBe(`${site.url}/blog/${base.slug}`);
    expect(s.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": `${site.url}/blog/${base.slug}`,
    });
  });

  it("credits the byline as the author", () => {
    const s = blogPostingSchema(base);
    expect(s.author).toEqual({ "@type": "Person", name: "Joey Lianko" });
  });

  it("falls back to the company as author when a post has no byline", () => {
    const s = blogPostingSchema({ ...base, byline: null });
    expect(s.author).toEqual({
      "@type": "Organization",
      name: site.name,
      url: site.url,
    });
  });

  it("names the company as publisher, with a logo", () => {
    const s = blogPostingSchema(base);
    expect(s.publisher).toEqual({
      "@type": "Organization",
      name: site.name,
      logo: { "@type": "ImageObject", url: `${site.url}/ppl-logo.png` },
    });
  });

  it("uses the editorial published date, not the row's creation date", () => {
    const s = blogPostingSchema(base);
    expect(s.datePublished).toBe("2024-12-09T00:00:00Z");
    expect(s.dateModified).toBe("2026-08-06T14:44:04.295Z");
  });

  it("falls back to created_at when a post has no published date", () => {
    const s = blogPostingSchema({ ...base, published_at: null });
    expect(s.datePublished).toBe("2026-08-04T14:03:14.026Z");
  });

  it("omits the dates entirely rather than emitting an invalid one", () => {
    const s = blogPostingSchema({
      ...base,
      published_at: null,
      created_at: null,
      updated_at: null,
    });
    expect(s).not.toHaveProperty("datePublished");
    expect(s).not.toHaveProperty("dateModified");
  });

  it("dates a never-edited post by its publication date", () => {
    const s = blogPostingSchema({ ...base, updated_at: null });
    expect(s.dateModified).toBe("2024-12-09T00:00:00Z");
  });

  it("passes an already-absolute cover image through untouched", () => {
    const s = blogPostingSchema(base);
    expect(s.image).toBe(base.cover_image_url);
  });

  it("makes a relative cover image absolute", () => {
    const s = blogPostingSchema({ ...base, cover_image_url: "/blog/x.png" });
    expect(s.image).toBe(`${site.url}/blog/x.png`);
  });

  it("omits image when the post has no cover — the placeholder is not the article's image", () => {
    const s = blogPostingSchema({ ...base, cover_image_url: null });
    expect(s).not.toHaveProperty("image");
  });

  it("collapses the excerpt's line breaks into a single-line description", () => {
    const s = blogPostingSchema({
      ...base,
      excerpt: "  First line.\n\nSecond line.  ",
    });
    expect(s.description).toBe("First line. Second line.");
  });

  it("omits description when the excerpt is empty or whitespace", () => {
    expect(blogPostingSchema({ ...base, excerpt: null })).not.toHaveProperty(
      "description",
    );
    expect(blogPostingSchema({ ...base, excerpt: "   " })).not.toHaveProperty(
      "description",
    );
  });
});
