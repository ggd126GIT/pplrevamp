"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flush, queueEvent } from "@/lib/analytics/events";
import { classifyClick } from "@/lib/analytics/clicks";
import { SECTION_DWELL_MS, shouldFireSection } from "@/lib/analytics/sections";

/**
 * One section_view per (session, path, section). Module scope so it lives for
 * the tab: sections re-enter view constantly when scrolling back up, and
 * unchecked, one indecisive visitor reads as twelve.
 */
const seen = new Set<string>();

export function InteractionTracker() {
  const pathname = usePathname();

  // Section visibility. Rebuilt per path — the DOM is replaced on navigation.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const timers = new Map<Element, number>();

    const fire = (el: Element, key: string) => {
      seen.add(`${pathname}:${key}`);
      queueEvent("section_view", key, pathname);
      observer.unobserve(el);
      const timer = timers.get(el);
      if (timer) {
        window.clearTimeout(timer);
        timers.delete(el);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          const key = el.getAttribute("data-track-section");
          if (!key) continue;

          if (seen.has(`${pathname}:${key}`)) {
            observer.unobserve(el);
            continue;
          }

          if (!entry.isIntersecting) {
            const timer = timers.get(el);
            if (timer) {
              window.clearTimeout(timer);
              timers.delete(el);
            }
            continue;
          }

          if (shouldFireSection(entry.intersectionRatio, 0)) {
            fire(el, key);
          } else if (!timers.has(el)) {
            timers.set(
              el,
              window.setTimeout(() => fire(el, key), SECTION_DWELL_MS),
            );
          }
        }
      },
      { threshold: [0, 0.5] },
    );

    document
      .querySelectorAll("[data-track-section]")
      .forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname]);

  // Clicks — one delegated listener, allowlist only.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        const start = event.target as Element | null;
        if (!start?.closest) return;

        const tagged = start.closest("[data-track-click]");
        const anchor = start.closest("a[href]");
        if (!tagged && !anchor) return;

        const result = classifyClick(
          {
            trackAttr: tagged?.getAttribute("data-track-click"),
            href: anchor?.getAttribute("href"),
          },
          window.location.host,
        );
        if (result) {
          queueEvent("click", result.label, pathname, result.meta);
        }
      } catch {
        // Analytics must never break the page.
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Flush lifecycle. The cleanup flush is what covers client-side navigation:
  // the App Router never unloads between routes, so without it every event
  // from the previous page is silently discarded on internal navigation.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [pathname]);

  return null;
}
