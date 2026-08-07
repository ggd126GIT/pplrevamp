/**
 * The rendered blog post body, shared by the public route and the admin preview.
 *
 * Both MUST render through this component — see the note on
 * `components/careers/JobDetail.tsx`. The callers differ only in which rows they
 * are allowed to fetch, never in how those rows are drawn.
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CtaBand } from "@/components/CtaBand";
import { renderTiptap } from "@/lib/tiptap";
import { excerptLines } from "@/lib/excerpt";
import { formatManilaDate } from "@/lib/dates";
import { ShareLinks } from "@/components/ShareLinks";
import { absoluteUrl } from "@/lib/share";
import { blogPostingSchema, type PostForSchema } from "@/lib/postSchema";
import type { Tables } from "@/lib/database.types";

export function PostDetail({
  post,
  includeSchema = true,
}: {
  post: Tables<"posts">;
  includeSchema?: boolean;
}) {
  const html = renderTiptap(post.content);
  const excerpt = excerptLines(post.excerpt).join("\n");

  return (
    <>
      {/* The public route is the canonical post, so the BlogPosting markup
          lives there and never on a preview, which must not be indexable at
          all — same rule as JobDetail. */}
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogPostingSchema(post as PostForSchema)),
          }}
        />
      )}
      <article className="pb-8 pt-14 sm:pt-20">
        <Container size="narrow">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-purple hover:underline"
          >
            <ArrowLeft className="size-4" /> All posts
          </Link>

          <p className="mt-8 text-sm font-medium uppercase tracking-wide text-purple">
            <time dateTime={post.published_at ?? undefined}>
              {formatManilaDate(post.published_at)}
            </time>
            {post.byline && <span> · {post.byline}</span>}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          {excerpt && (
            <p className="mt-4 whitespace-pre-line text-lg text-charcoal/70">
              {excerpt}
            </p>
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

          <div className="mt-12 border-t border-black/[0.06] pt-6">
            <ShareLinks
              url={absoluteUrl(`/blog/${post.slug}`)}
              title={post.title}
            />
          </div>
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
