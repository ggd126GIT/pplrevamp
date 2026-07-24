/**
 * Pure display formatters for stored geo values. No DOM, no I/O — unit-tested
 * in format.test.ts. Kept separate from parse.ts, which handles inbound
 * request parsing rather than presentation.
 */

/** "Makati, PH" — value plus country code, or just the value when country is unknown. */
export function placeLabel(place: string, country: string | null): string {
  return country ? `${place}, ${country}` : place;
}

/**
 * Location line for an inquiry: city+country, else country, else null so the
 * strip omits the segment entirely rather than printing "Unknown".
 */
export function journeyLocation(
  city: string | null,
  country: string | null,
): string | null {
  if (city) return placeLabel(city, country);
  if (country) return country;
  return null;
}
