"use client";

import { useEffect, useRef } from "react";
import { Container } from "@/components/ui/Container";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { threeDs } from "@/lib/content";

/**
 * Organic blob used both as the visible card and as the icon clip path.
 * Traced from the client-supplied SHAPE.png silhouette.
 */
const BLOB =
  "M 73.76 10.14 C 83.65 9.75, 94.02 13.71, 103.74 16.91 C 113.46 20.11, 122.24 27.07, 132.07 29.31 C 141.9 31.55, 154.41 26.37, 162.74 30.35 C 171.07 34.34, 179.75 44.39, 182.03 53.22 C 184.31 62.05, 175.75 73.42, 176.45 83.3 C 177.15 93.17, 183.64 102.57, 186.23 112.47 C 188.82 122.37, 192.9 132.89, 192 142.7 C 191.1 152.51, 186.92 163.65, 180.85 171.31 C 174.78 178.97, 164.88 185.6, 155.55 188.69 C 146.22 191.78, 134.95 191.08, 124.85 189.86 C 114.75 188.65, 104.97 181.78, 94.95 181.4 C 84.93 181.02, 74.79 187.24, 64.71 187.59 C 54.63 187.94, 43.2 187.73, 34.49 183.51 C 25.78 179.29, 16.84 170.83, 12.43 162.25 C 8.02 153.67, 6.52 141.72, 8 132.02 C 9.48 122.33, 19.08 113.84, 21.31 104.08 C 23.54 94.32, 20.77 83.63, 21.38 73.45 C 21.99 63.27, 21.13 52.02, 24.97 42.99 C 28.81 33.96, 36.29 24.73, 44.42 19.25 C 52.55 13.77, 63.87 10.53, 73.76 10.14 Z";

/**
 * Motion-safe desktop presentation of the 3Ds framework: a pinned section whose
 * single blob-shaped card scrubs through Discover -> Design -> Deliver as you
 * scroll. Each phase plays its own effect, tied to scroll progress:
 *   1. Discover — a magnifying glass zooms in.
 *   2. Design   — a pen draws a simple line (SVG draw-on, pen rides the path).
 *   3. Deliver  — the rocket launches and vanishes up through the blob.
 *
 * All icons live inside a group clipped to the blob, so the rocket clips away as
 * it exits the top. Visibility is owned by CSS (.threeds-stage) — this markup is
 * hidden and the animation left unwired on mobile / reduced motion, where the
 * static grid in ThreeDs.tsx renders instead. Order here must match `threeDs`.
 */
export function ThreeDsPinned() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const q = <T extends Element>(sel: string) =>
      Array.from(el.querySelectorAll<T>(sel));
    const one = <T extends Element>(sel: string) => el.querySelector<T>(sel);

    const iconLayers = q<SVGGElement>("[data-icon]");
    const copyLayers = q<HTMLElement>("[data-copy]");
    const pillFills = q<HTMLElement>("[data-pill-fill]");
    const pillNums = q<HTMLElement>("[data-pill-num]");
    const progressFill = one<HTMLElement>("[data-progress-fill]");

    const zoom = one<SVGElement>("[data-zoom]");
    const penGroup = one<SVGGElement>("[data-pen]");
    const writePath = one<SVGPathElement>("[data-write]");
    const rocket = one<SVGElement>("[data-rocket]");
    const flame = one<SVGElement>("[data-flame]");
    const streaks = one<SVGElement>("[data-streaks]");

    const muted = "rgba(35,43,49,0.4)";

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        // Initial states — first phase live, others hidden.
        gsap.set([iconLayers[1], iconLayers[2]], { autoAlpha: 0 });
        gsap.set([copyLayers[1], copyLayers[2]], { autoAlpha: 0, y: 24 });
        gsap.set([pillFills[1], pillFills[2]], { autoAlpha: 0 });
        gsap.set([pillNums[1], pillNums[2]], { color: muted });
        gsap.set(pillNums[0], { color: "#fff" });
        gsap.set(progressFill, { scaleX: 0, transformOrigin: "left center" });

        gsap.set(zoom, { scale: 0.7, autoAlpha: 0.35, svgOrigin: "100 100" });

        // Design line: driven by a single progress value so the pen's nib always
        // sits on the drawn tip. `dasharray = "L bigGap"` reveals exactly [0, L]
        // from the start; the pen is parked at the matching point.
        const lineLen = writePath?.getTotalLength() ?? 0;
        const drawTo = (L: number) => {
          if (!writePath) return;
          writePath.style.strokeDasharray = `${L} ${lineLen + 1}`;
          const pt = writePath.getPointAtLength(L);
          gsap.set(penGroup, { x: pt.x, y: pt.y });
        };
        drawTo(0);

        gsap.set(flame, { scaleY: 0.2, autoAlpha: 0, svgOrigin: "100 122" });
        gsap.set(streaks, { autoAlpha: 0, y: -6 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + window.innerHeight * 3,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // Continuous progress bar across the whole sequence.
        tl.to(progressFill, { scaleX: 1, duration: 3 }, 0);

        // Phase 1 — Discover: a simple zoom-in.
        tl.to(
          zoom,
          { scale: 1.12, autoAlpha: 1, ease: "power2.out", duration: 0.9 },
          0,
        );

        // Transition 1 -> 2.
        transition(tl, 0.9, 0, 1);

        // Phase 2 — Design: draw the line while the pen rides its leading tip.
        const draw = { p: 0 };
        tl.to(
          draw,
          {
            p: 1,
            duration: 0.8,
            onUpdate: () => drawTo(draw.p * lineLen),
          },
          1.0,
        );

        // Transition 2 -> 3.
        transition(tl, 1.9, 1, 2);

        // Phase 3 — Deliver: ignite, launch, and vanish up through the blob.
        tl.to(
          flame,
          { scaleY: 1, autoAlpha: 1, ease: "power1.out", duration: 0.3 },
          2.2,
        )
          .to(streaks, { autoAlpha: 1, y: 12, duration: 0.4 }, 2.3)
          .to(
            [rocket, flame],
            { y: -165, ease: "power2.in", duration: 0.7 },
            2.35,
          )
          // Streaks trail off as the rocket climbs away.
          .to(streaks, { autoAlpha: 0, y: 30, duration: 0.4 }, 2.55)
          .to([rocket, flame], { autoAlpha: 0, duration: 0.2 }, 2.9);

        function transition(
          t: gsap.core.Timeline,
          at: number,
          from: number,
          to: number,
        ) {
          t.to(iconLayers[from], { autoAlpha: 0, duration: 0.2 }, at)
            .to(copyLayers[from], { autoAlpha: 0, y: -24, duration: 0.2 }, at)
            .to(pillFills[from], { autoAlpha: 0, duration: 0.2 }, at)
            .to(pillNums[from], { color: muted, duration: 0.2 }, at)
            .to(iconLayers[to], { autoAlpha: 1, duration: 0.2 }, at + 0.05)
            .to(pillFills[to], { autoAlpha: 1, duration: 0.2 }, at + 0.05)
            .to(pillNums[to], { color: "#fff", duration: 0.2 }, at + 0.05)
            .fromTo(
              copyLayers[to],
              { autoAlpha: 0, y: 24 },
              { autoAlpha: 1, y: 0, duration: 0.25 },
              at + 0.05,
            );
        }
      },
    );

    // Recompute once fonts/layout settle so pin distances are correct.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      window.clearTimeout(refresh);
      mm.revert();
    };
  }, []);

  return (
    <div
      ref={root}
      className="threeds-stage min-h-screen w-full items-center overflow-hidden"
    >
      <Container size="wide" className="w-full">
        <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-16">
          {/* Icon stage — blob card with icons clipped to its shape */}
          <div className="mx-auto w-full max-w-[26rem]">
            <svg
              viewBox="0 0 200 200"
              className="w-full"
              style={{
                filter: "drop-shadow(0 24px 40px rgba(147,82,161,0.35))",
              }}
            >
              <defs>
                <linearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a945cc" />
                  <stop offset="52%" stopColor="#cf5aa8" />
                  <stop offset="100%" stopColor="#fd9224" />
                </linearGradient>
                <radialGradient id="blobHi" cx="0.35" cy="0.28" r="0.6">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <clipPath id="blobClip">
                  <path d={BLOB} />
                </clipPath>
              </defs>

              <path d={BLOB} fill="url(#blobGrad)" />
              <path d={BLOB} fill="url(#blobHi)" />

              <g clipPath="url(#blobClip)">
                {/* Icons scaled to 75% about the blob centre (100,100) */}
                <g transform="translate(25 25) scale(0.75)">
                {/* Phase 1 — magnifying glass (simple zoom) */}
                <g data-icon>
                  <g data-zoom>
                    <circle
                      cx="90"
                      cy="90"
                      r="34"
                      stroke="#fff"
                      strokeWidth="7"
                      fill="none"
                    />
                    <line
                      x1="114"
                      y1="114"
                      x2="150"
                      y2="150"
                      stroke="#fff"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                  </g>
                </g>

                {/* Phase 2 — pen drawing a simple line */}
                <g data-icon>
                  <path
                    data-write
                    d="M60 108 C 84 92, 116 92, 140 100"
                    stroke="#fff"
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* nib at local (0,0); body extends upward */}
                  <g data-pen>
                    <path d="M0 0 L-6 -13 L6 -13 Z" fill="#fff" />
                    <rect
                      x="-5"
                      y="-50"
                      width="10"
                      height="38"
                      rx="5"
                      fill="#fff"
                    />
                    <rect
                      x="-5"
                      y="-58"
                      width="10"
                      height="9"
                      rx="3"
                      fill="#ffd66b"
                    />
                  </g>
                </g>

                {/* Phase 3 — rocket launch */}
                <g data-icon>
                  <g data-streaks>
                    <line
                      x1="82"
                      y1="132"
                      x2="82"
                      y2="146"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <line
                      x1="118"
                      y1="132"
                      x2="118"
                      y2="146"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <line
                      x1="100"
                      y1="138"
                      x2="100"
                      y2="154"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                  </g>
                  <g data-flame>
                    <path
                      d="M100 122 C 93 134, 93 146, 100 156 C 107 146, 107 134, 100 122 Z"
                      fill="#ffc82b"
                    />
                    <path
                      d="M100 126 C 96 134, 96 140, 100 146 C 104 140, 104 134, 100 126 Z"
                      fill="#fff"
                      opacity="0.85"
                    />
                  </g>
                  <g data-rocket>
                    <path
                      d="M100 56 C 116 74, 116 104, 100 124 C 84 104, 84 74, 100 56 Z"
                      fill="#fff"
                    />
                    <path
                      d="M86 104 C 80 108, 78 118, 80 126 L 92 118 Z"
                      fill="#ffd66b"
                    />
                    <path
                      d="M114 104 C 120 108, 122 118, 120 126 L 108 118 Z"
                      fill="#ffd66b"
                    />
                    <circle cx="100" cy="86" r="8" fill="#7a3d88" />
                    <circle cx="100" cy="86" r="4" fill="#b47ec0" />
                  </g>
                </g>
                </g>
              </g>
            </svg>
          </div>

          {/* Copy stage */}
          <div>
            {/* Stepper */}
            <div className="relative mb-12 flex max-w-md items-center justify-between">
              <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-black/10">
                <div
                  data-progress-fill
                  className="h-full origin-left bg-gradient-to-r from-grad-from to-grad-to"
                />
              </div>
              {threeDs.map((step, i) => (
                <div
                  key={step.key}
                  className="relative z-10 grid size-11 place-items-center rounded-full border border-black/10 bg-white"
                >
                  <span
                    data-pill-fill
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-grad-from to-grad-to"
                  />
                  <span
                    data-pill-num
                    className="relative font-display text-sm font-bold"
                  >
                    0{i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Crossfading copy */}
            <div className="relative min-h-[16rem]">
              {threeDs.map((step, i) => (
                <div key={step.key} data-copy className="absolute inset-0">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-purple">
                    Step 0{i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-4xl font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-lg text-lg leading-relaxed text-charcoal/75">
                    {step.blurb}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
