/**
 * Pure display formatters for stored geo values. No DOM, no I/O — unit-tested
 * in format.test.ts. Kept separate from parse.ts, which handles inbound
 * request parsing rather than presentation.
 */

/** Regional-indicator flag emoji for a two-letter ISO code, or "" for anything else. */
export function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  const BASE = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(
    BASE + code.charCodeAt(0) - 65,
    BASE + code.charCodeAt(1) - 65,
  );
}

/** "Makati, PH" — or just the city when country is unknown. */
export function cityLabel(city: string, country: string | null): string {
  return country ? `${city}, ${country}` : city;
}

/**
 * Location line for an inquiry: city+country, else country, else null so the
 * strip omits the segment entirely rather than printing "Unknown".
 */
export function journeyLocation(
  city: string | null,
  country: string | null,
): string | null {
  if (city) return cityLabel(city, country);
  if (country) return country;
  return null;
}
