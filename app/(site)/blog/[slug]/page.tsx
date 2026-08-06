import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blog/PostDetail";
import { createPublicClient } from "@/lib/supabase/public";
import { excerptLines } from "@/lib/excerpt";
import { absoluteUrl, previewDescription } from "@/lib/share";
import { site } from "@/lib/site";

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
  const url = absoluteUrl(`/blog/${slug}`);
  const description = previewDescription(
    post.excerpt ?? `Insights from ${site.name}.`,
  );
  // A real cover wins; when there is none, omit the `images` key entirely
  // (not just set it to `undefined`) so Next's file-convention merge kicks
  // in — it checks `hasOwnProperty('images')`, not the value, so a present-
  // but-undefined key would silently suppress the generated
  // `opengraph-image` route (Task 7).
  const images = post.cover_image_url ? [post.cover_image_url] : undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      siteName: site.name,
      publishedTime: post.published_at ?? undefined,
      ...(images ? { images } : {}),
    },
    twitter: {
      // Without this the card renders as a small square thumbnail.
      card: "summary_large_image",
      title: post.title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return <PostDetail post={post} />;
}
