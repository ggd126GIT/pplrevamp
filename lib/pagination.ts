/** Rows per page across the admin list views. */
export const ADMIN_PAGE_SIZE = 15;

/** Coerce a raw ?page= search param into a 1-based page number (>= 1). */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
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
