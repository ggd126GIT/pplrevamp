/**
 * Manila is UTC+8 and has never observed DST, so a fixed offset is exact and
 * spares us a timezone library.
 */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** What <input type="date"> submits. Anything else is a typo, not a date. */
const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn an <input type="date"> value into the instant that day ends in Manila.
 *
 * Blank gives null (no expiry) and malformed gives undefined, so the caller can
 * tell "cleared" from "typo" and refuse to silently drop a date someone meant
 * to set.
 */
export function manilaEndOfDay(input: string): string | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!DATE_INPUT.test(trimmed)) return undefined;

  // Validate that the date is actually valid for that month/day.
  // JavaScript's Date.parse will accept 2026-02-30 and roll it over to 2026-03-02,
  // so we check that the parsed date actually matches the input.
  const [year, month, day] = trimmed.split("-");
  const dateObj = new Date(`${trimmed}T00:00:00Z`);
  if (
    dateObj.getUTCFullYear() !== parseInt(year, 10) ||
    dateObj.getUTCMonth() + 1 !== parseInt(month, 10) ||
    dateObj.getUTCDate() !== parseInt(day, 10)
  ) {
    return undefined;
  }

  const ms = Date.parse(`${trimmed}T23:59:59.999+08:00`);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/**
 * The reverse: a stored timestamptz back to the yyyy-mm-dd the date input
 * expects. An instant late in a Manila day belongs to the *previous* UTC day,
 * so shift before formatting or the form shows the wrong date by one.
 */
export function toDateInput(ts: string | null | undefined): string {
  if (!ts) return "";
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}
