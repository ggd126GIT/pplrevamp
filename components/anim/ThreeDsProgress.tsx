"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * Scroll-driven enhancement for the 3Ds section: the connecting line fills as
 * the section scrolls into view, and each step rises in sequence.
 * Renders nothing; targets [data-threeds-*] within the parent section.
 */
export function ThreeDsProgress() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = anchor.current?.closest("[data-threeds]");
    if (!section) return;

    const line = section.querySelector<HTMLElement>("[data-threeds-line]");
    const steps = section.querySelectorAll<HTMLElement>("[data-threeds-step]");

    if (prefersReducedMotion()) {
      if (line) line.style.transform = "scaleX(1)";
      return;
    }

    const ctx = gsap.context(() => {
      if (line) {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 65%",
              end: "bottom 70%",
              scrub: true,
            },
          },
        );
      }

      gsap.from(steps, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.18,
        scrollTrigger: { trigger: section, start: "top 70%" },
      });
    }, section as Element);

    return () => ctx.revert();
  }, []);

  // Refresh triggers once fonts/layout settle.
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => window.clearTimeout(id);
  }, []);

  return <span ref={anchor} className="hidden" aria-hidden />;
}
