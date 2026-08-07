import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { BlogList } from "@/components/BlogList";
import { BlogPagination } from "@/components/BlogPagination";
import { CtaBand } from "@/components/CtaBand";
import { fetchPostsPage } from "@/lib/blogPosts";
import { absoluteUrl } from "@/lib/share";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on offshoring, outsourcing, and BPO from the .ppl Solutions, Inc. team.",
  alternates: { canonical: absoluteUrl("/blog") },
};

export const revalidate = 60;

export default async function BlogPage() {
  const { posts, pageCount } = await fetchPostsPage(1);

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Insights from our .ppl"
        intro="Perspectives on offshoring, outsourcing, and building high-performing teams."
        image="/blog/ppl-blog-hero-team-overhead.webp"
      />

      <Section bg="white">
        <Container size="wide">
          {!posts.length ? (
            <div className="mx-auto max-w-md text-center">
              <p className="text-lg text-charcoal/70">
                Our first posts are on the way. Check back soon.
              </p>
              <div className="mt-8 flex justify-center">
                <Button href="/contact" variant="outline">
                  Contact Us
                </Button>
              </div>
            </div>
          ) : (
            <>
              <BlogList posts={posts} />
              <BlogPagination page={1} pageCount={pageCount} />
            </>
          )}
        </Container>
      </Section>

      {/* Individual posts already end on a CtaBand; the listing was the one
          blog surface with no route onward. Suppressed on the empty state,
          which carries its own Contact button. */}
      {posts.length > 0 && (
        <CtaBand
          title="Ready to power your business strategies?"
          subtitle="Let's talk about how our .ppl can help."
          buttonLabel="Get in Touch"
        />
      )}
    </>
  );
}
