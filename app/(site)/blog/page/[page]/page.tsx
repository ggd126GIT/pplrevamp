import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { BlogList } from "@/components/BlogList";
import { BlogPagination } from "@/components/BlogPagination";
import { CtaBand } from "@/components/CtaBand";
import { fetchPostsPage, fetchPostsPageCount } from "@/lib/blogPosts";
import { parsePageSegment } from "@/lib/pagination";
import { absoluteUrl } from "@/lib/share";

export const revalidate = 60;

/**
 * Pages 2..N only. Page 1 is `/blog`, so it is deliberately absent here and
 * redirected below — one page, one URL.
 */
export async function generateStaticParams() {
  const count = await fetchPostsPageCount();
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const n = parsePageSegment(page);
  if (!n) return { title: "Page not found" };

  return {
    title: `Blog — Page ${n}`,
    description:
      "Insights on offshoring, outsourcing, and BPO from the .ppl Solutions, Inc. team.",
    alternates: { canonical: absoluteUrl(`/blog/page/${n}`) },
  };
}

export default async function BlogPagedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const n = parsePageSegment(page);
  if (!n) notFound();
  if (n === 1) redirect("/blog");

  const { posts, pageCount } = await fetchPostsPage(n);
  // Past the last page there is nothing to show, and an empty grid would be a
  // soft 404 — say so properly instead.
  if (!posts.length) notFound();

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
          <BlogList posts={posts} />
          <BlogPagination page={n} pageCount={pageCount} />
        </Container>
      </Section>

      {/* Matches /blog — a reader on page 2 is further in, not less
          interested. An empty page 404s above, so there is no empty state. */}
      <CtaBand
        title="Ready to power your business strategies?"
        subtitle="Let's talk about how our .ppl can help."
        buttonLabel="Get in Touch"
      />
    </>
  );
}
