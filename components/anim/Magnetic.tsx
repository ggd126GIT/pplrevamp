"use client";

import { useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";
import { magneticOffset } from "@/lib/magnetic";

/**
 * Wraps a child so it drifts toward the pointer (magnetic hover). Disabled
 * for reduced motion and coarse pointers.
 *
 * `maxOffset` is a hard pixel cap rather than a multiplier, so the effect feels
 * the same on a narrow button and a wide one. See lib/magnetic.ts.
 */
export function Magnetic({
  children,
  maxOffset = 8,
  className,
}: {
  children: React.ReactNode;
  maxOffset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const allow = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !prefersReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || !allow()) return;
    const rect = el.getBoundingClientRect();
    const { x, y } = magneticOffset(
      rect,
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      maxOffset,
    );
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ display: "inline-block", transition: "transform 0.3s ease-out" }}
    >
      {children}
    </span>
  );
}
