/** Rows per page across the admin list views. */
export const ADMIN_PAGE_SIZE = 15;

/** Posts per page on the public /blog listing. Three full rows of the grid. */
export const BLOG_PAGE_SIZE = 9;

/** Coerce a raw ?page= search param into a 1-based page number (>= 1). */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * Read a `/blog/page/[page]` path segment, or null when it is not one.
 *
 * Deliberately stricter than `parsePage`: a bad *query* param should still
 * render page 1, because the visitor got there by clicking. A bad *path*
 * segment is a URL that does not exist and the caller must 404 it. Alternate
 * spellings of a valid number ("01", "1e3", " 2 ") are rejected too, so a page
 * is reachable at exactly one URL.
 */
export function parsePageSegment(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  return Number(raw);
}

/** Inclusive [from, to] row indices for a Supabase .range() call. */
export function pageRange(page: number, size = ADMIN_PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

/** Total number of pages for a given row count (min 1). */
export function pageCount(total: number | null, size = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil((total ?? 0) / size));
}
