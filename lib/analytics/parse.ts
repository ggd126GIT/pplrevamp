/**
 * Pure request-parsing helpers for analytics capture. No I/O, no Next imports —
 * everything here is unit-tested in parse.test.ts.
 */

export type Device = "mobile" | "tablet" | "desktop";

const BOT_RE =
  /bot|crawl|spider|slurp|headless|puppeteer|playwright|phantomjs|curl|wget|python-requests|axios|go-http-client|java\/|lighthouse|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petalbot|facebookexternalhit|embedly|preview|monitor|scan/i;

/** Absent user-agents are treated as bots: real browsers always send one. */
export function isBot(ua: string | null): boolean {
  if (!ua || ua.trim() === "") return true;
  return BOT_RE.test(ua);
}

export function deviceFromUserAgent(ua: string | null): Device {
  if (!ua) return "desktop";
  // Tablets first: an Android tablet looks like a phone minus the Mobile token.
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

const stripWww = (host: string) => host.replace(/^www\./, "");

/** External referrer host, or null for same-site navigation / bad input. */
export function referrerHost(
  referrer: string | null,
  siteHost: string,
): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (stripWww(host) === stripWww(siteHost.toLowerCase())) return null;
  return host;
}

const SOURCE_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)google\.[a-z.]{2,6}$/, "google"],
  [/(^|\.)bing\.[a-z.]{2,6}$/, "bing"],
  [/(^|\.)duckduckgo\.[a-z.]{2,6}$/, "duckduckgo"],
  [/(^|\.)yahoo\.[a-z.]{2,6}$/, "yahoo"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)fb\.com$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)t\.co$/, "x"],
  [/(^|\.)x\.com$/, "x"],
];

export function deriveSource(
  host: string | null,
  utmSource?: string | null,
): string {
  if (utmSource && utmSource.trim()) {
    return utmSource.trim().toLowerCase().slice(0, 64);
  }
  if (!host) return "direct";
  const lowerHost = host.toLowerCase();
  for (const [re, name] of SOURCE_HOSTS) {
    if (re.test(lowerHost)) return name;
  }
  return stripWww(lowerHost);
}

const MAX_PATH = 512;

export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  const path = trimmed.split(/[?#]/)[0];
  return path.length > MAX_PATH ? path.slice(0, MAX_PATH) : path;
}

export function extractUtm(query: string): Record<string, string> | null {
  if (!query) return null;
  const params = new URLSearchParams(
    query.startsWith("?") ? query.slice(1) : query,
  );
  const utm: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.startsWith("utm_") && value) utm[key] = value.slice(0, 128);
  }
  return Object.keys(utm).length ? utm : null;
}

export type Geo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "x-geoip-country"];
const REGION_HEADERS = ["x-vercel-ip-country-region", "x-geoip-region"];
const CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity", "x-geoip-city"];
const MAX_GEO = 128;

/** First non-empty value across a header fallback chain, trimmed. */
function firstHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Country is validated per header, not just first-non-empty: Cloudflare sends
 * XX for anonymised clients and T1 for Tor, and we want the next edge's value
 * when that happens.
 */
function countryFromHeaders(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") {
      return value;
    }
  }
  return null;
}

/** URL-decoded, trimmed, length-capped city. Decode failure keeps the raw value. */
function cityFromHeaders(headers: Headers): string | null {
  const raw = firstHeader(headers, CITY_HEADERS);
  if (!raw) return null;
  let city = raw;
  try {
    city = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding: fall back to the raw header value.
  }
  city = city.trim();
  return city ? city.slice(0, MAX_GEO) : null;
}

/**
 * Country, region, and city from whichever edge set them. `x-vercel-ip-*` exist
 * only on Vercel; a VPS falls back to Cloudflare or Nginx GeoIP headers. Any
 * field is null when no edge resolved it. Never throws.
 */
export function geoFromHeaders(headers: Headers): Geo {
  const region = firstHeader(headers, REGION_HEADERS);
  // Vercel sends "00" for an unresolved subdivision — treat it as no region.
  return {
    country: countryFromHeaders(headers),
    region: region && region !== "00" ? region.slice(0, MAX_GEO) : null,
    city: cityFromHeaders(headers),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export type EventType = "section_view" | "click";

export type NormalizedEvent = {
  type: EventType;
  label: string;
  path: string;
  meta: { href: string } | null;
};

const EVENT_TYPES: EventType[] = ["section_view", "click"];
const MAX_EVENTS_PER_BATCH = 50;
const MAX_LABEL = 64;
const MAX_HREF = 512;

/**
 * Validates a client event batch. Individual bad events are dropped rather than
 * rejecting the batch — one malformed entry must not lose a whole page's data.
 * Returns null only when nothing usable survives.
 */
export function normalizeEventBatch(
  body: unknown,
): { sessionId: string; events: NormalizedEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const { sessionId, events } = body as Record<string, unknown>;
  if (!isUuid(sessionId) || !Array.isArray(events)) return null;

  const normalized: NormalizedEvent[] = [];
  for (const raw of events.slice(0, MAX_EVENTS_PER_BATCH)) {
    if (!raw || typeof raw !== "object") continue;
    const { type, label, path, meta } = raw as Record<string, unknown>;

    if (!EVENT_TYPES.includes(type as EventType)) continue;

    const cleanLabel =
      typeof label === "string" ? label.trim().slice(0, MAX_LABEL) : "";
    if (!cleanLabel) continue;

    const cleanPath = sanitizePath(path);
    if (!cleanPath) continue;

    // Only href survives from meta; anything else the client sends is ignored.
    const href =
      meta && typeof meta === "object"
        ? (meta as Record<string, unknown>).href
        : undefined;

    normalized.push({
      type: type as EventType,
      label: cleanLabel,
      path: cleanPath,
      meta: typeof href === "string" && href ? { href: href.slice(0, MAX_HREF) } : null,
    });
  }

  return normalized.length ? { sessionId, events: normalized } : null;
}
