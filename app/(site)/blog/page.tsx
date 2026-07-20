import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on offshoring, outsourcing, and BPO from the .ppl Solutions, Inc. team.",
};

export const revalidate = 60;

function formatDate(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
}

export default async function BlogPage() {
  const supabase = createPublicClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Insights from our .ppl"
        intro="Perspectives on offshoring, outsourcing, and building high-performing teams."
        image="/blog/ppl-blog-header.jpg"
      />

      <Section bg="white">
        <Container size="wide">
          {!posts?.length ? (
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
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-mist">
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src="/blog/ppl-blog-placeholder.png"
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <time className="text-xs font-medium uppercase tracking-wide text-purple">
                      {formatDate(post.published_at)}
                    </time>
                    <h2 className="mt-2 text-lg font-bold text-ink">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm text-charcoal/70">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple">
                      Read more
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
