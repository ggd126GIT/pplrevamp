/**
 * Manila is UTC+8 and has never observed DST, so a fixed offset is exact and
 * spares us a timezone library.
 */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** What <input type="date"> submits. Anything else is a typo, not a date. */
const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What <input type="datetime-local"> submits. Seconds are optional: browsers
 * append them only once a step smaller than a minute is in play.
 */
const DATE_TIME_INPUT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

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
  if (!isRealDate(trimmed)) return undefined;

  const ms = Date.parse(`${trimmed}T23:59:59.999+08:00`);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/**
 * The mirror of `manilaEndOfDay`: the instant that day *begins* in Manila.
 *
 * Used as the inclusive lower bound of a date-range filter, so an application
 * submitted at 00:30 Manila on the "from" date is included. Comparing against
 * the bare date string instead would silently drop it, because the stored value
 * is UTC and 00:30 Manila is the previous UTC day.
 */
export function manilaStartOfDay(input: string): string | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!DATE_INPUT.test(trimmed)) return undefined;
  if (!isRealDate(trimmed)) return undefined;

  const ms = Date.parse(`${trimmed}T00:00:00.000+08:00`);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/**
 * Whether a yyyy-mm-dd string names a day that exists.
 *
 * `Date.parse` accepts 2026-02-30 and rolls it over to 2026-03-02, so a
 * round-trip comparison is the only way to reject it.
 */
export function isRealDate(date: string): boolean {
  const [year, month, day] = date.split("-");
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    parsed.getUTCFullYear() === parseInt(year, 10) &&
    parsed.getUTCMonth() + 1 === parseInt(month, 10) &&
    parsed.getUTCDate() === parseInt(day, 10)
  );
}

/**
 * Turn an <input type="datetime-local"> value into the instant it names in
 * Manila. The input carries no zone, so the wall-clock reading an editor sees
 * is the one they meant.
 *
 * Same three-way contract as `manilaEndOfDay`: blank gives null (cleared),
 * malformed gives undefined (typo), so a caller never mistakes one for the
 * other and silently drops a date someone meant to set.
 */
export function manilaDateTime(input: string): string | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = DATE_TIME_INPUT.exec(trimmed);
  if (!match) return undefined;

  const [, date, hours, minutes, seconds] = match;
  if (!isRealDate(date)) return undefined;
  // The regex only guarantees two digits, not that they name a real time.
  if (
    parseInt(hours, 10) > 23 ||
    parseInt(minutes, 10) > 59 ||
    parseInt(seconds ?? "0", 10) > 59
  ) {
    return undefined;
  }

  const ms = Date.parse(
    `${date}T${hours}:${minutes}:${seconds ?? "00"}.000+08:00`,
  );
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

/**
 * The reverse of `manilaDateTime`: a stored timestamptz back to the
 * yyyy-mm-ddThh:mm a datetime-local input expects, read in Manila time.
 */
export function toDateTimeInput(ts: string | null | undefined): string {
  if (!ts) return "";
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 16);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * The reader-facing date on posts and job listings, e.g. "August 4, 2026".
 *
 * Deliberately not `toLocaleDateString`: that reads the *server's* timezone, so
 * anything published in the small hours of a Manila morning renders as the
 * previous day wherever the box runs UTC. The company is in Manila and the
 * date it shows should be Manila's.
 */
export function formatManilaDate(ts: string | null | undefined): string {
  if (!ts) return "";
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms + MANILA_OFFSET_MS);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
