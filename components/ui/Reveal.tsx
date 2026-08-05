"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { REVEAL_TIMEOUT_MS, revealClassName, revealDelay } from "@/lib/reveal";

/**
 * Fade + rise on scroll into view (once). Uses IntersectionObserver so it
 * works without JS-heavy libraries; the base/visible states live in
 * globals.css and are disabled under prefers-reduced-motion.
 *
 * The observer is not the only path to visible. `.reveal` starts at
 * `opacity: 0`, so an observer that never fires leaves the content invisible
 * *permanently* rather than merely unanimated — which is how a slow script, a
 * bfcache restore or a browser quirk turns into a blank section. A timeout
 * reveals anything still hidden after REVEAL_TIMEOUT_MS, and globals.css
 * carries a <noscript> floor for the case where this never runs at all.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Distinguishes "scrolled to" from "rescued", so the rescue can skip the
  // transition and the stagger.
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    const finish = (wasForced: boolean) => {
      if (done) return;
      done = true;
      if (wasForced) setForced(true);
      setVisible(true);
      observer.disconnect();
      window.clearTimeout(timer);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) finish(false);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);

    const timer = window.setTimeout(() => finish(true), REVEAL_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const appliedDelay = revealDelay(delay, forced);

  return (
    <Tag
      ref={ref as never}
      className={cn(revealClassName(visible, forced), className)}
      style={appliedDelay ? { transitionDelay: `${appliedDelay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
