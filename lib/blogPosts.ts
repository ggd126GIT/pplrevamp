import { createPublicClient } from "@/lib/supabase/public";
import { BLOG_PAGE_SIZE, pageCount, pageRange } from "@/lib/pagination";

/** One card on the /blog listing. */
export type PostCard = {
  id: string;
  slug: string;
  title: string;
  byline: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

/**
 * One page of published posts, newest first.
 *
 * The single place the listing query lives, so `/blog` and `/blog/page/[page]`
 * cannot drift apart in what they select, filter or order by.
 */
export async function fetchPostsPage(page: number): Promise<{
  posts: PostCard[];
  pageCount: number;
}> {
  const { from, to } = pageRange(page, BLOG_PAGE_SIZE);
  const supabase = createPublicClient();
  const { data, count } = await supabase
    .from("posts")
    .select("id, slug, title, byline, excerpt, cover_image_url, published_at", {
      count: "exact",
    })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  return { posts: data ?? [], pageCount: pageCount(count, BLOG_PAGE_SIZE) };
}

/** Total pages of published posts, for `generateStaticParams`. */
export async function fetchPostsPageCount(): Promise<number> {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return pageCount(count, BLOG_PAGE_SIZE);
}
