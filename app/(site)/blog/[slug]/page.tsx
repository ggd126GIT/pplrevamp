import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CtaBand } from "@/components/CtaBand";
import { createPublicClient } from "@/lib/supabase/public";
import { renderTiptap } from "@/lib/tiptap";

export const revalidate = 60;

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((p) => ({ slug: p.slug }));
}

async function getPost(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

function formatDate(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const html = renderTiptap(post.content);

  return (
    <>
      <article className="pb-8 pt-14 sm:pt-20">
        <Container size="narrow">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline"
          >
            <ArrowLeft className="size-4" /> All posts
          </Link>

          <time className="mt-8 block text-sm font-medium uppercase tracking-wide text-purple">
            {formatDate(post.published_at)}
          </time>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-charcoal/70">{post.excerpt}</p>
          )}

          {post.cover_image_url && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div
            className="rich-content mt-10"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </Container>
      </article>

      <CtaBand
        title="Ready to power your business strategies?"
        subtitle="Let's talk about how our .ppl can help."
        buttonLabel="Get in Touch"
      />
    </>
  );
}
