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
 * Matched against the User-Agent header. Substrings, not anchored patterns —
 * these agents append versions and contact URLs, and some (TelegramBot) also
 * name another bot in the same string.
 */
const CARD_CRAWLERS =
  /facebookexternalhit|facebookcatalog|linkedinbot|twitterbot|slackbot|whatsapp|discordbot|telegrambot|redditbot|pinterest/i;

/** Individual posts and job postings, including their `opengraph-image` route. */
const SHAREABLE = /^\/(blog|careers)\/[^/]+/;

/** Read-only methods. A crawler UA is a forgeable header, so nothing else. */
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function isCardCrawler(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent) && CARD_CRAWLERS.test(userAgent as string);
}

export function isShareablePath(pathname: string): boolean {
  return SHAREABLE.test(pathname);
}

/**
 * True when a request may skip the staging gate. Deliberately narrow: a safe
 * method, on a single post or job, from a known card crawler.
 */
export function allowCardCrawler(
  method: string,
  pathname: string,
  userAgent: string | null | undefined,
): boolean {
  return (
    SAFE_METHODS.has(method.toUpperCase()) &&
    isShareablePath(pathname) &&
    isCardCrawler(userAgent)
  );
}

/** The same agents, for the per-user-agent groups in `robots.txt`. */
export const CARD_CRAWLER_AGENTS = [
  "facebookexternalhit",
  "LinkedInBot",
  "Twitterbot",
  "Slackbot",
  "WhatsApp",
  "Discordbot",
  "TelegramBot",
] as const;
