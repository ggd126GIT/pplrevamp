import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Prev/next page controls for the admin list views. Renders nothing on a single page. */
export function Pagination({
  page,
  pageCount,
  basePath,
}: {
  page: number;
  pageCount: number;
  basePath: string;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const base =
    "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors";
  const enabled = "bg-white text-ink border border-black/10 hover:bg-mist";
  const disabled = "cursor-not-allowed text-charcoal/30 border border-black/[0.06]";

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
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
