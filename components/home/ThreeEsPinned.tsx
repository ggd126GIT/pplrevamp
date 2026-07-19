"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { threeEs } from "@/lib/content";

/** Ring radius in the 0..100 viewBox — hugs the image, only slightly larger. */
const RING_R = 51.5;
/** Comet trail: number of dots and the angular gap between them (degrees). */
const COMET = [
  { r: 3.2, o: 1 },
  { r: 2.7, o: 0.82 },
  { r: 2.2, o: 0.64 },
  { r: 1.7, o: 0.47 },
  { r: 1.25, o: 0.32 },
  { r: 0.85, o: 0.2 },
];
const COMET_STEP = 8; // degrees between trail dots

/**
 * Motion-safe desktop presentation of the 3E's advantage: a pinned section that
 * scrubs through Economical -> Efficient & Effective -> Evolving & Elevating.
 * Image sits on the RIGHT (mirroring the 3Ds stage). Per phase:
 *   1. The photo shows desaturated (grayscale) while a gradient ring — drawn by
 *      a comet (bright head dot with a tapering tail) — traces around it,
 *      hugging its edge.
 *   2. As the ring closes, the comet fades and the photo's colour returns.
 *   3. The title reveals, then the short copy types out.
 *   4. The completed state holds; ScrollTrigger snaps to a resting point on each
 *      E so it never whips past and can be read.
 *
 * Visibility is owned by CSS (.threees-stage) — hidden and unwired on mobile /
 * reduced motion, where the static grid in ThreeEs.tsx renders instead.
 */
export function ThreeEsPinned() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const q = <T extends Element>(sel: string) =>
      Array.from(el.querySelectorAll<T>(sel));
    const one = <T extends Element>(sel: string) => el.querySelector<T>(sel);

    const images = q<HTMLElement>("[data-img]");
    const ringGroups = q<SVGGElement>("[data-ring-group]");
    const rings = q<SVGCircleElement>("[data-ring]");
    const cometGroups = q<SVGGElement>("[data-comet-group]");
    const comets = cometGroups.map((g) =>
      Array.from(g.querySelectorAll<SVGCircleElement>("[data-comet]")),
    );
    const titles = q<HTMLElement>("[data-title]");
    const copyLayers = q<HTMLElement>("[data-copy]");
    const chars = q<HTMLElement>("[data-type]").map((p) =>
      Array.from(p.querySelectorAll<HTMLElement>("[data-ch]")),
    );
    const pillFills = q<HTMLElement>("[data-pill-fill]");
    const pillNums = q<HTMLElement>("[data-pill-num]");
    const progressFill = one<HTMLElement>("[data-progress-fill]");

    const muted = "rgba(35,43,49,0.4)";

    // Reveal the solid ring up to the comet head and drag the trail behind it.
    const drawRing = (i: number, p: number) => {
      rings[i].style.strokeDashoffset = String(1 - p);
      const headDeg = -90 + 360 * p; // start at 12 o'clock, go clockwise
      const dots = comets[i];
      for (let k = 0; k < dots.length; k++) {
        const ang = ((headDeg - k * COMET_STEP) * Math.PI) / 180;
        gsap.set(dots[k], {
          x: RING_R * Math.cos(ang),
          y: RING_R * Math.sin(ang),
        });
      }
    };

    // Reveal the first `n` characters of phase `i` (display toggle keeps the
    // caret trailing the last typed glyph as the text grows and wraps).
    const showChars = (i: number, n: number) => {
      const cs = chars[i];
      for (let k = 0; k < cs.length; k++) {
        cs[k].style.display = k < n ? "" : "none";
      }
    };

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        // Initial states — phase 0's grayscale photo + undrawn ring live.
        images.forEach((im) => (im.style.filter = "grayscale(1)"));
        gsap.set(images.slice(1), { autoAlpha: 0, scale: 0.85 });
        gsap.set(images[0], { autoAlpha: 0.5, scale: 0.85 });
        gsap.set(copyLayers.slice(1), { autoAlpha: 0 });
        gsap.set(copyLayers[0], { autoAlpha: 1 });
        gsap.set(titles, { autoAlpha: 0, y: 14 });
        gsap.set(cometGroups, { autoAlpha: 0 });
        // All ring groups start hidden — the round stroke cap would otherwise
        // show a dot at the ring's start point before the draw begins.
        gsap.set(ringGroups, { autoAlpha: 0 });
        gsap.set(pillFills.slice(1), { autoAlpha: 0 });
        gsap.set(pillFills[0], { autoAlpha: 1 });
        gsap.set(pillNums, { color: muted });
        gsap.set(pillNums[0], { color: "#fff" });
        gsap.set(progressFill, { scaleX: 0, transformOrigin: "left center" });

        rings.forEach((r) => {
          r.style.strokeDasharray = "1";
          r.style.strokeDashoffset = "1";
        });
        comets.forEach((_, i) => drawRing(i, 0));
        threeEs.forEach((_, i) => showChars(i, 0));

        const PHASE = 2.75; // per-E timeline span (draw + reveal + type + hold)
        const TAIL = 1.0; // trailing hold on the final E before unpin
        // Empty lead-in so the comet/ring aren't seen while the section is still
        // scrolling into place, before the pin settles at the top.
        const LEAD = 0.35;
        const total = LEAD + (threeEs.length - 1) * PHASE + 1.78 + TAIL;

        // Resting points (mid-hold) the scroll snaps to so each E can be read.
        const snapPoints = threeEs.map(
          (_, i) => (LEAD + i * PHASE + 2.2) / total,
        );

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + window.innerHeight * 5,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            snap: {
              snapTo: snapPoints,
              duration: { min: 0.2, max: 0.5 },
              delay: 0.05,
              ease: "power1.inOut",
            },
          },
        });

        // Continuous progress bar across the whole sequence (after the lead-in).
        tl.to(progressFill, { scaleX: 1, duration: total - TAIL - LEAD }, LEAD);
        // Pad the timeline so the final E holds before the section unpins.
        tl.to({}, { duration: total }, 0);

        threeEs.forEach((item, i) => {
          const t = LEAD + i * PHASE;

          // Fade the previous phase away as this one begins (phase 0 is preset).
          if (i > 0) {
            tl.to(images[i - 1], { autoAlpha: 0, duration: 0.25 }, t)
              .to(
                copyLayers[i - 1],
                { autoAlpha: 0, y: -16, duration: 0.25 },
                t,
              )
              .to(ringGroups[i - 1], { autoAlpha: 0, duration: 0.25 }, t)
              .to(pillFills[i - 1], { autoAlpha: 0, duration: 0.2 }, t)
              .to(pillNums[i - 1], { color: muted, duration: 0.2 }, t)
              .set(copyLayers[i], { autoAlpha: 1 }, t)
              .set(ringGroups[i], { autoAlpha: 1 }, t)
              .set(images[i], { autoAlpha: 0.5, scale: 0.85 }, t);
          }

          // Light this phase's stepper pill.
          tl.to(pillFills[i], { autoAlpha: 1, duration: 0.2 }, t).to(
            pillNums[i],
            { color: "#fff", duration: 0.2 },
            t,
          );

          // Turn this phase's ring group live only as the phase begins (phase 0
          // isn't handled by the crossfade block above).
          if (i === 0) tl.set(ringGroups[i], { autoAlpha: 1 }, t);

          // The photo grows from 50% opacity to full size as the ring draws.
          tl.to(
            images[i],
            { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" },
            t,
          );

          // 1 — the comet traces the gradient ring around the grayscale photo.
          // Fade the comet in just after t (not .set) so it stays hidden while
          // the timeline is clamped at progress 0 before the pin.
          const ring = { p: 0 };
          tl.to(cometGroups[i], { autoAlpha: 1, duration: 0.06 }, t)
            .to(
              ring,
              { p: 1, duration: 0.6, onUpdate: () => drawRing(i, ring.p) },
              t,
            )
            .to(cometGroups[i], { autoAlpha: 0, duration: 0.12 }, t + 0.56);

          // 2 — the photo stays grayscale through most of the draw, its colour
          // returning only as the ring closes.
          const gray = { v: 1 };
          tl.to(
            gray,
            {
              v: 0,
              duration: 0.24,
              onUpdate: () => {
                images[i].style.filter =
                  gray.v > 0.001 ? `grayscale(${gray.v})` : "none";
              },
            },
            t + 0.42,
          );

          // 3 — the title reveals, then the short copy types out.
          tl.to(titles[i], { autoAlpha: 1, y: 0, duration: 0.2 }, t + 0.92);

          const typ = { n: 0 };
          const len = chars[i].length;
          tl.to(
            typ,
            {
              n: len,
              duration: 0.6,
              onUpdate: () => showChars(i, Math.round(typ.n)),
            },
            t + 1.16,
          );
          // 4 — hold: nothing tweens until the next phase (dwell to read).
        });
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
      className="threees-stage min-h-screen w-full items-center overflow-hidden"
    >
      <Container size="wide" className="w-full">
        <div className="grid grid-cols-[1.1fr_0.9fr] items-center gap-16">
          {/* Copy stage (left) */}
          <div>
            {/* Stepper */}
            <div className="relative mb-12 flex max-w-md items-center justify-between">
              <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-black/10">
                <div
                  data-progress-fill
                  className="h-full origin-left bg-gradient-to-r from-grad-from to-grad-to"
                />
              </div>
              {threeEs.map((item, i) => (
                <div
                  key={item.key}
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
              {threeEs.map((item, i) => (
                <div key={item.key} data-copy className="absolute inset-0">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-purple">
                    The 3E&apos;s · 0{i + 1}
                  </span>
                  <h3
                    data-title
                    className="mt-3 font-display text-4xl font-extrabold text-ink"
                  >
                    {item.title}
                  </h3>
                  <p
                    data-type
                    className="mt-4 max-w-lg text-lg leading-relaxed text-charcoal/75"
                  >
                    {item.short.split("").map((ch, k) => (
                      <span key={k} data-ch>
                        {ch}
                      </span>
                    ))}
                    <span className="ty-caret" aria-hidden />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Image stage (right) — grayscale photos the comet ring colours in */}
          <div className="relative mx-auto aspect-square w-full max-w-[28rem]">
            {threeEs.map((item, i) => (
              <div key={item.key} className="absolute inset-0">
                <div data-img className="absolute inset-0">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 1280px) 40vw, 28rem"
                    className="object-contain"
                    priority={i === 0}
                  />
                </div>
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <linearGradient
                      id={`eGrad-${i}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#a945cc" />
                      <stop offset="100%" stopColor="#fd9224" />
                    </linearGradient>
                  </defs>
                  <g data-ring-group>
                    <circle
                      data-ring
                      cx="50"
                      cy="50"
                      r={RING_R}
                      fill="none"
                      stroke={`url(#eGrad-${i})`}
                      strokeWidth="2"
                      strokeLinecap="round"
                      pathLength={1}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        transform: "rotate(-90deg)",
                      }}
                    />
                  </g>
                  <g data-comet-group>
                    {COMET.map((d, k) => (
                      <circle
                        key={k}
                        data-comet
                        cx="50"
                        cy="50"
                        r={d.r}
                        fill="#fd9224"
                        opacity={d.o}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
