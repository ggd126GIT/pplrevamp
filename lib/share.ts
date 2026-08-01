/**
 * Share links and link-preview text. Pure string work with no DOM access, kept
 * out of the component because vitest runs `environment: "node"` and only
 * collects `**\/*.test.ts` — logic in a `.tsx` file cannot be tested at all.
 */
import { site } from "@/lib/site";

/**
 * LinkedIn and Facebook truncate a card description around 200–300 characters
 * and some crawlers drop an over-long one outright, so clamp before it reaches
 * the tag rather than letting a pasted job paragraph through at full length.
 */
const MAX_PREVIEW_DESCRIPTION = 200;

export type ShareTargets = {
  linkedin: string;
  facebook: string;
  x: string;
};

/** Absolute URL for a root-relative path, from `NEXT_PUBLIC_SITE_URL`. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/**
 * Collapse whitespace and clamp to a whole word, so a card never ends
 * mid-word or mid-sentence-punctuation. Returns the text unchanged when it
 * already fits.
 */
export function previewDescription(
  text: string,
  max: number = MAX_PREVIEW_DESCRIPTION,
): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s.,;:!?—-]+$/, "")}…`;
}

/**
 * Plain share endpoints — no SDK, so no third-party cookie and no consent
 * banner. Each network reads only the `url`; X also accepts prefill text.
 */
export function shareLinks(url: string, title: string): ShareTargets {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  };
}
