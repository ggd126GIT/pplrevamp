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

/**
 * Two-letter country from whichever edge set it. `x-vercel-ip-country` only
 * exists on Vercel, so the VPS falls back to Cloudflare's `cf-ipcountry` or an
 * Nginx GeoIP header. Returns null when no edge resolved a country.
 */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-geoip-country",
];

export function countryFromHeaders(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    // Cloudflare sends XX for anonymised/unknown clients, T1 for Tor.
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") {
      return value;
    }
  }
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
