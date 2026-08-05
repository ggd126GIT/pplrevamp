import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Page 1 lives at /blog, not /blog/page/1 — one URL per page. */
function href(page: number) {
  return page <= 1 ? "/blog" : `/blog/page/${page}`;
}

/**
 * Prev/next controls for the public blog listing. Renders nothing on a single
 * page, so it stays invisible until there are more than BLOG_PAGE_SIZE posts.
 *
 * Separate from `components/admin/Pagination` on purpose: that one builds
 * `?page=` hrefs and wears the admin's plain styling.
 */
export function BlogPagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const base =
    "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors";
  const enabled = "border border-purple/30 text-purple hover:bg-purple/5";
  const disabled = "cursor-not-allowed border border-black/[0.06] text-charcoal/30";

  return (
    <nav
      className="mt-12 flex items-center justify-between"
      aria-label="Blog pagination"
    >
      {hasPrev ? (
        <Link href={href(page - 1)} className={cn(base, enabled)} rel="prev">
          <ChevronLeft className="size-4" /> Previous
        </Link>
      ) : (
        <span className={cn(base, disabled)} aria-disabled>
          <ChevronLeft className="size-4" /> Previous
        </span>
      )}

      <span className="text-sm text-charcoal/60">
        Page {page} of {pageCount}
      </span>

      {hasNext ? (
        <Link href={href(page + 1)} className={cn(base, enabled)} rel="next">
          Next <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(base, disabled)} aria-disabled>
          Next <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
