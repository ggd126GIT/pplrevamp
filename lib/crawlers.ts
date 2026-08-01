/**
 * Social card crawlers, allowed past the staging gate so link previews can be
 * demonstrated before cutover.
 *
 * While `STAGING_PASSWORD` is set the whole site answers 401, which every card
 * crawler sees as an unfetchable URL — Facebook and X then render a bare link
 * and LinkedIn discards the URL altogether. Letting these agents through on
 * post and job pages only is what makes a preview renderable pre-launch.
 *
 * Search engines are deliberately absent from the list, and every response
 * still carries `x-robots-tag: noindex, nofollow`, so nothing here makes the
 * staging build indexable.
 *
 * All of this is inert in production: the gate exits before reaching it once
 * `STAGING_PASSWORD` is unset, so there is nothing to remove at cutover.
 */

/**
 * The single source of truth, used both to match the User-Agent header and to
 * emit the per-agent `robots.txt` groups in `app/robots.ts`. One list because
 * the two must not drift: an agent named in robots.txt that the proxy refuses
 * would advertise a URL and then 401 it, and an agent the proxy admits without
 * a robots.txt group falls into `*` → `Disallow: /` and never requests at all.
 *
 * Entries are matched as case-insensitive substrings, so they must be plain
 * tokens with no regex metacharacters.
 */
export const CARD_CRAWLER_AGENTS = [
  "facebookexternalhit",
  "LinkedInBot",
  "Twitterbot",
  "Slackbot",
  "WhatsApp",
  "Discordbot",
  "TelegramBot",
] as const;

/** Substrings, not anchored: these agents append versions and contact URLs. */
const CARD_CRAWLERS = new RegExp(CARD_CRAWLER_AGENTS.join("|"), "i");

/**
 * A single post or job, optionally its `opengraph-image` route — Next serves
 * that with a content-hash suffix (`/opengraph-image-1ejm5s`), hence the loose
 * tail on that segment. Anchored so a future nested route under `[slug]` does
 * not silently inherit the exemption; the optional trailing slash keeps a
 * pasted `…/slug/` URL working, since the gate runs before Next can redirect.
 */
const SHAREABLE = /^\/(blog|careers)\/[^/]+(\/opengraph-image[^/]*)?\/?$/;

/** Read-only methods. A crawler UA is a forgeable header, so nothing else. */
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function isCardCrawler(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent) && CARD_CRAWLERS.test(userAgent as string);
}

export function isShareablePath(pathname: string): boolean {
  return SHAREABLE.test(pathname);
}

/**
 * Everything a card crawler must reach. `/robots.txt` is included because
 * these agents honour it: behind the gate it answers 401, and a crawler that
 * cannot read the file either ignores robots entirely (RFC 9309 §2.3.1.3) or
 * treats the 401 as a blanket disallow — so the per-agent groups would never
 * be seen and the exemption would never be exercised. Exposing it costs
 * nothing; on staging it says `Disallow: /` to everyone else by construction.
 */
export function isCrawlerReadable(pathname: string): boolean {
  return pathname === "/robots.txt" || isShareablePath(pathname);
}

/**
 * True when a request may skip the staging gate. Deliberately narrow: a safe
 * method, on a crawler-readable path, from a known card crawler.
 */
export function allowCardCrawler(
  method: string,
  pathname: string,
  userAgent: string | null | undefined,
): boolean {
  return (
    SAFE_METHODS.has(method.toUpperCase()) &&
    isCrawlerReadable(pathname) &&
    isCardCrawler(userAgent)
  );
}
