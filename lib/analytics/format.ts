/**
 * Pure display formatters for stored geo values. No DOM, no I/O — unit-tested
 * in format.test.ts. Kept separate from parse.ts, which handles inbound
 * request parsing rather than presentation.
 */

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
