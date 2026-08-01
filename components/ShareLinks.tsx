"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/icons/brand";
import { shareLinks } from "@/lib/share";

const CONTROL =
  "inline-flex size-10 items-center justify-center rounded-full border border-black/[0.08] text-charcoal/70 transition-colors hover:border-purple hover:text-purple";

/**
 * Share row. `url` is absolute and supplied by the server so the links follow
 * `NEXT_PUBLIC_SITE_URL` and correct themselves at cutover; reading
 * `window.location` here would hand out staging URLs.
 */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(url, title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied. Say nothing rather than claim a
      // copy that did not happen.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <span className="text-sm font-semibold text-charcoal/60">Share</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy link"
          data-track-click="share-copy"
          className={CONTROL}
        >
          {copied ? (
            <Check className="size-4 text-purple" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
        <a
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          data-track-click="share-linkedin"
          className={CONTROL}
        >
          <LinkedInIcon className="size-4" />
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          data-track-click="share-facebook"
          className={CONTROL}
        >
          <FacebookIcon className="size-4" />
        </a>
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          data-track-click="share-x"
          className={CONTROL}
        >
          <XIcon className="size-4" />
        </a>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
