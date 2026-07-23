import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { Pagination } from "@/components/admin/Pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const { data: posts, count } = await supabase
    .from("posts")
    .select("id, title, slug, status, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Posts</h1>
          <p className="mt-1 text-charcoal/60">Write and publish blog posts.</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-grad-from to-grad-to px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="size-4" /> New post
        </Link>
      </div>

      {!posts?.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          No posts yet.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}`}
              className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-mist"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="truncate font-semibold text-ink">
                    {post.title}
                  </h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      post.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {post.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-charcoal/50">
                  /{post.slug}
                </p>
              </div>
              <Pencil className="size-4 shrink-0 text-charcoal/40" />
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount(count)} basePath="/admin/posts" />
    </div>
  );
}
