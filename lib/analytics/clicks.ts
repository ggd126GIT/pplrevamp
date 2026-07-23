/**
 * Click classification. Deliberately an allowlist, not a full click map: a
 * click map is noise at this traffic volume and its selectors break on every
 * markup edit. Pure — takes plain values, not DOM nodes.
 */

export type ClickTarget = { trackAttr?: string | null; href?: string | null };
export type ClickResult = { label: string; meta?: { href: string } } | null;

const MAX_LABEL = 64;

const stripWww = (host: string) => host.replace(/^www\./, "");

export function classifyClick(
  { trackAttr, href }: ClickTarget,
  siteHost: string,
): ClickResult {
  // An explicit annotation always wins — it survives copy changes.
  const label = trackAttr?.trim().slice(0, MAX_LABEL);
  if (label) return { label };

  if (!href) return null;
  if (href.startsWith("mailto:")) return { label: "email", meta: { href } };
  if (href.startsWith("tel:")) return { label: "phone", meta: { href } };

  let url: URL;
  try {
    // Relative hrefs resolve against the site host, so they read as internal.
    url = new URL(href, `https://${siteHost}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (stripWww(url.hostname.toLowerCase()) === stripWww(siteHost.toLowerCase())) {
    return null;
  }
  return { label: "outbound", meta: { href } };
}
