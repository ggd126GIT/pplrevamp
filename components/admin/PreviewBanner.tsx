import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

/**
 * Marks a page as a preview rather than the live article.
 *
 * Deliberately loud and fixed to the top: the whole point of a preview is that it
 * is indistinguishable from production below this bar, which is exactly what
 * makes an unlabelled one dangerous — someone reads it, believes the item is
 * live, and never publishes it.
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
    <>
      <div className="fixed inset-x-0 top-0 z-[100] bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Eye className="size-4" aria-hidden="true" />
            Preview — not live
          </span>
          <span className="text-white/70">
            {label} · status <strong className="font-semibold">{status}</strong>
          </span>
          <Link
            href={editHref}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Back to editor
          </Link>
        </div>
      </div>
      {/* Spacer so the fixed bar never covers the page's own header. */}
      <div aria-hidden="true" className="h-11" />
    </>
  );
}
