import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

/**
 * Marks a page as a preview rather than the live article.
 *
 * Deliberately loud and pinned: the whole point of a preview is that it is
 * indistinguishable from production below this bar, which is exactly what makes
 * an unlabelled one dangerous — someone reads it, believes the item is live, and
 * never publishes it.
 *
 * The height is fixed at 2.75rem and must stay in step with the
 * `body:has(.preview-bar)` rules in globals.css, which shift the page down and
 * re-anchor the sticky site header beneath the bar. That is why the middle text
 * truncates instead of wrapping — a two-line bar would silently overlap the
 * header again, which is the bug this replaced.
 *
 * Rendered only by the /preview routes, never by the shared detail components,
 * so it can never leak onto a public page.
 */
export function PreviewBanner({
  status,
  editHref,
  label,
}: {
  /** The item's real status, e.g. "draft", "closed", "expired". */
  status: string;
  editHref: string;
  label: string;
}) {
  return (
    <div className="preview-bar fixed inset-x-0 top-0 z-[100] h-11 bg-slate-700 text-white shadow-sm">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 text-sm">
        <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
          <Eye className="size-4" aria-hidden="true" />
          Preview — not live
        </span>
        <span className="hidden truncate text-white/70 sm:block">
          {label} · status{" "}
          <strong className="font-semibold text-white">{status}</strong>
        </span>
        <Link
          href={editHref}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Back to editor
        </Link>
      </div>
    </div>
  );
}
