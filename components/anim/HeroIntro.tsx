"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Staggered entrance for the hero. Renders nothing; animates the sibling
 * elements marked with [data-hero] inside the nearest <section>.
 * If reduced motion is requested, elements stay in their natural state.
 */
export function HeroIntro() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = anchor.current?.closest("section");
    if (!section) return;
    const targets = section.querySelectorAll<HTMLElement>("[data-hero]");
    if (!targets.length || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return <span ref={anchor} className="hidden" aria-hidden />;
}
