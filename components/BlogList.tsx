import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { excerptLines } from "@/lib/excerpt";
import { formatManilaDate } from "@/lib/dates";
import type { PostCard } from "@/lib/blogPosts";

/** The blog card grid. Shared by /blog and /blog/page/[page]. */
export function BlogList({ posts }: { posts: PostCard[] }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/blog/${post.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-mist">
            <Image
              src={
                post.cover_image_url ?? "/blog/ppl-blog-placeholder-meeting.webp"
              }
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <time
              dateTime={post.published_at ?? undefined}
              className="text-xs font-medium uppercase tracking-wide text-purple"
            >
              {formatManilaDate(post.published_at)}
            </time>
            <h2 className="mt-2 text-lg font-bold text-ink">{post.title}</h2>
            {post.byline && (
              <p className="mt-1.5 text-sm font-medium text-charcoal/60">
                By {post.byline}
              </p>
            )}
            {post.excerpt && (
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-charcoal/70">
                {excerptLines(post.excerpt).join("\n")}
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
  );
}
