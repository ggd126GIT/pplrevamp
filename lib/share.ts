/**
 * Share-link construction. Pure string work with no DOM access, kept out of the
 * component because vitest runs `environment: "node"` and only collects
 * `**\/*.test.ts` — logic in a `.tsx` file cannot be tested at all.
 */
import { site } from "@/lib/site";

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
