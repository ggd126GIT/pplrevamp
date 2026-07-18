"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Card with a subtle 3D tilt that follows the pointer. Disabled for users
 * who prefer reduced motion and on touch (pointer: coarse) devices.
 */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const allowTilt = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !allowTilt()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(
      2,
    )}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:shadow-xl hover:shadow-purple/10 [transform-style:preserve-3d]",
        className,
      )}
    >
      {children}
    </div>
  );
}
