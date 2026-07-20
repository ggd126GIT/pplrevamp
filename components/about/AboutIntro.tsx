"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const P1 =
  ".ppl Solutions, Inc. was built with the vision of being the playground of the best people. With us, we work with them and open doors of opportunities through the right training — developing them to become their best self yet. Nurturing a culture that supports people is what our leaders took to heart through their combined 100+ years of working in the industry.";

const P2 =
  "What this means to you as our client is that you have fun-loving, transformative people who are ready to take on your challenges and driven to deliver ultimate client and customer satisfaction. As your expert partner, we will guide you in your BPO transformation — from discovery to delivery — as you enable your outsourcing or offshoring strategies.";

const RING_TEXT =
  ".ppl Solutions, Inc., a place with the best people for outstanding clients. · ";

/**
 * About intro — motion-safe desktop presentation. A circular photo sits in the
 * upper zone; as you scroll, the two paragraphs are pushed left and right and a
 * ring of words revolves around the photo. Then the photo collapses to a small
 * black dot which slides LEFT and then FALLS straight down — an L-shaped travel
 * that draws a dashed comet-tail trail along both legs — from the photo's spot
 * to the "+" slot in "100+ years" in the lower zone. The Leadership heading
 * fades in during the fall (delivered by the drop, not just loaded); on impact
 * the dot morphs into the "+" glyph and both trails fade out. The travel plays
 * out slowly over a long pin range. Snaps to reading rests.
 *
 * Gated by CSS (.about-intro-stage) — the static two-column layout in
 * `.about-intro-static` renders on mobile / reduced motion instead.
 */
export function AboutIntro() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const one = <T extends Element>(s: string) => el.querySelector<T>(s);

    const inner = one<HTMLElement>("[data-inner]");
    const p1 = one<HTMLElement>("[data-p1]");
    const p2 = one<HTMLElement>("[data-p2]");
    const center = one<HTMLElement>("[data-center]");
    const imgEl = one<HTMLElement>("[data-img-el]");
    const ring = one<HTMLElement>("[data-ring]");
    const lead = one<HTMLElement>("[data-lead]");
    const plus = one<HTMLElement>("[data-plus]");
    const dot = one<HTMLElement>("[data-dot]");
    const trail = one<HTMLElement>("[data-trail]");
    const trailH = one<HTMLElement>("[data-trail-h]");

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        // Measure key positions in the inner stage's coordinate space.
        const relPoint = (node: HTMLElement | null) => {
          const R = inner!.getBoundingClientRect();
          const r = (node ?? inner!).getBoundingClientRect();
          return {
            cx: r.left - R.left + r.width / 2,
            cy: r.top - R.top + r.height / 2,
            top: r.top - R.top,
            left: r.left - R.left,
          };
        };
        // Anchor the photo's centring transform FIRST, so its measured centre
        // is the true (translated) centre — otherwise the fall would start from
        // below the photo rather than from it.
        gsap.set(center, {
          autoAlpha: 0,
          scale: 1.45,
          xPercent: -50,
          yPercent: -50,
        });

        const circle = relPoint(imgEl); // photo centre (upper zone)
        const p = relPoint(plus); // the "+" slot in "100+ years" (lower zone)

        // Initial states — paragraphs, ring, heading and the travelling dot all
        // hidden. (The photo's transform is set above.)
        gsap.set(ring, { autoAlpha: 0 });
        gsap.set(p1, { autoAlpha: 0, x: 190 });
        gsap.set(p2, { autoAlpha: 0, x: -190 });
        gsap.set(lead, { autoAlpha: 0 });
        gsap.set(dot, {
          autoAlpha: 0,
          x: circle.cx,
          y: circle.cy,
          scale: 1,
          xPercent: -50,
          yPercent: -50,
        });
        // The "+" in "100+ years" starts absent — the dot completes it on
        // landing. (No-JS / no-motion leaves it at its default, fully visible.)
        gsap.set(plus, { autoAlpha: 0, scale: 0.2, transformOrigin: "50% 55%" });
        // The trail: a thin dashed line laid along the fall path (from the
        // photo's spot down to the "+"), drawn downward as the dot falls so the
        // heading is delivered by the drop rather than just appearing.
        gsap.set(trail, {
          left: p.cx,
          top: circle.cy,
          height: Math.max(0, p.cy - circle.cy),
          xPercent: -50,
          scaleY: 0,
          autoAlpha: 0,
          transformOrigin: "top center",
        });
        // The left trail: a horizontal dashed line along the sideways slide
        // (from the photo's centre left to above the "+"), drawn as the dot
        // moves across — same comet-tail idea, but horizontal.
        gsap.set(trailH, {
          left: p.cx,
          top: circle.cy,
          width: Math.max(0, circle.cx - p.cx),
          yPercent: -50,
          scaleX: 0,
          autoAlpha: 0,
          transformOrigin: "right center",
        });

        const LEAD = 0.12; // small buffer so nothing shows before the pin settles
        const total = 7.0;
        // Reading rests: (1) paragraphs + ring readable, (2) the dot has settled
        // and become the "+" completing the heading. The morph finishes at
        // t≈6.1, so the second rest sits just past it.
        const snapPoints = [(LEAD + 2.2) / total, (LEAD + 6.2) / total];

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            // Longer pin range → the whole travel plays out over more scroll,
            // so the slide + drop read slower and more deliberate.
            end: () => "+=" + window.innerHeight * 6.4,
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
        tl.to({}, { duration: total }, 0); // set timeline length

        // Phase A — photo fades in + shrinks; paragraphs pushed to the sides.
        tl.to(
          center,
          { autoAlpha: 1, scale: 1, ease: "power1.out", duration: 1 },
          LEAD,
        )
          .to(p1, { autoAlpha: 1, x: 0, ease: "power2.out", duration: 1 }, LEAD)
          .to(p2, { autoAlpha: 1, x: 0, ease: "power2.out", duration: 1 }, LEAD);

        // (hold — paragraphs readable · snap)

        // Phase B — the ring of words revolves into view.
        tl.to(ring, { autoAlpha: 1, duration: 0.6 }, LEAD + 1.4);

        // (hold — everything readable · snap)

        // Phase C — intro clears out. The photo collapses FAST to a point and
        // fades (so no big translucent disc lingers over the text); the small
        // black dot takes over once the photo is essentially gone. The heading
        // is NOT revealed here — it arrives with the falling dot in Phase D.
        const C = LEAD + 2.9;
        tl.to([p1, p2], { autoAlpha: 0, duration: 0.5 }, C)
          .to(ring, { autoAlpha: 0, duration: 0.4 }, C)
          .to(
            center,
            { scale: 0.04, autoAlpha: 0, ease: "power2.in", duration: 0.45 },
            C,
          )
          .to(dot, { autoAlpha: 1, duration: 0.25 }, C + 0.4);

        // Phase D — the dot slides LEFT to sit directly above the "+" (drawing a
        // horizontal trail as it goes), then FALLS the full distance straight
        // down (drawing a vertical trail) — a slow, deliberate L-shaped travel.
        // The Leadership heading fades in during the fall — delivered by the
        // drop, not just loaded. On impact the dot morphs into the "+" glyph and
        // both trails fade out.
        const D = LEAD + 3.7;
        const slideDur = 0.6;
        const fallAt = D + slideDur;
        const fallDur = 1.5;
        const landAt = fallAt + fallDur;

        // slide left above the "+", still at the photo's level, drawing the
        // horizontal trail behind it in sync
        tl.set(trailH, { autoAlpha: 1 }, D)
          .to(
            dot,
            { x: p.cx, y: circle.cy, ease: "power2.inOut", duration: slideDur },
            D,
          )
          .to(
            trailH,
            { scaleX: 1, ease: "power2.inOut", duration: slideDur },
            D,
          );
        // the fall — dot drops while the vertical trail draws down behind it
        tl.set(trail, { autoAlpha: 1 }, fallAt)
          .to(dot, { y: p.cy, ease: "power2.in", duration: fallDur }, fallAt)
          .to(trail, { scaleY: 1, ease: "power2.in", duration: fallDur }, fallAt)
          // the heading arrives with the dot
          .to(lead, { autoAlpha: 1, ease: "power1.out", duration: 0.7 }, fallAt + 0.2);
        // impact — the "+" pops in, the dot vanishes, both trails fade away
        tl.to(
          plus,
          { autoAlpha: 1, scale: 1, ease: "back.out(1.7)", duration: 0.3 },
          landAt - 0.02,
        )
          .to(
            dot,
            { autoAlpha: 0, scale: 1.4, ease: "power2.in", duration: 0.2 },
            "<",
          )
          .to(
            [trail, trailH],
            { autoAlpha: 0, ease: "power1.out", duration: 0.45 },
            "<",
          );
        // (hold — heading complete, dot now the "+" · snap)
      },
    );

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 350);
    return () => {
      window.clearTimeout(refresh);
      mm.revert();
    };
  }, []);

  return (
    <>
      {/* Static fallback — mobile / reduced motion */}
      <section className="about-intro-static bg-white py-20 sm:py-28">
        <Container size="wide">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6 text-lg leading-relaxed text-charcoal/80">
              <p className="text-justify">{P1}</p>
              <p className="text-justify">{P2}</p>
              <p className="text-xl font-semibold text-ink">
                .ppl Solutions, Inc., a place with the best people for
                outstanding clients.
              </p>
            </div>
            <Reveal>
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full ring-1 ring-black/5">
                <Image
                  src="/about/ppl-laptop.png"
                  alt=".ppl Solutions team collaborating at their laptops"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Animated pinned stage — motion-safe desktop.
          The pinned element is wrapped in a stable outer <div> that GSAP never
          touches. ScrollTrigger's pin wraps the inner stage in a .pin-spacer,
          which changes that node's real DOM parent; without this wrapper React
          would try to removeChild the stage from a parent it no longer belongs
          to on route change, throwing "NotFoundError: not a child of this node". */}
      <div className="about-intro-stage-wrap">
      <div
        ref={root}
        className="about-intro-stage min-h-screen w-full items-start overflow-hidden bg-white"
      >
        <Container size="wide" className="relative w-full">
          <div data-inner className="relative min-h-screen">
            {/* Paragraph 1 — upper-left, level with the photo */}
            <p
              data-p1
              className="absolute left-0 top-[19rem] max-w-[23rem] -translate-y-1/2 text-justify text-lg leading-loose text-charcoal/80"
            >
              {P1}
            </p>

            {/* Paragraph 2 — upper-right, level with the photo */}
            <p
              data-p2
              className="absolute right-0 top-[19rem] max-w-[23rem] -translate-y-1/2 text-justify text-lg leading-loose text-charcoal/80"
            >
              {P2}
            </p>

            {/* Upper zone — photo with the revolving ring of words. A FIXED
                offset from the top (not a %) so the ring always clears the
                sticky header regardless of viewport height. GSAP keeps it
                centred here via xPercent/yPercent. */}
            <div
              data-center
              className="absolute left-1/2 top-[19rem] grid place-items-center"
            >
              <svg
                data-ring
                viewBox="0 0 400 400"
                className="about-revolve pointer-events-none absolute h-[132%] w-[132%]"
                aria-hidden
              >
                <defs>
                  <path
                    id="aboutRingPath"
                    d="M200,200 m-165,0 a165,165 0 1,1 330,0 a165,165 0 1,1 -330,0"
                    fill="none"
                  />
                </defs>
                <text fill="#9352a1" style={{ fontSize: "23px", fontWeight: 700 }}>
                  <textPath
                    href="#aboutRingPath"
                    startOffset="0"
                    textLength="1030"
                    lengthAdjust="spacing"
                  >
                    {RING_TEXT}
                  </textPath>
                </text>
              </svg>

              <div
                data-img-el
                className="relative aspect-square w-[17rem] overflow-hidden rounded-full ring-1 ring-black/5 shadow-xl shadow-purple/10"
              >
                <Image
                  src="/about/ppl-laptop.png"
                  alt=".ppl Solutions team collaborating at their laptops"
                  fill
                  sizes="17rem"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Lower zone — Leadership heading. Sits well below the photo so the
                dot has a long line to fall down. The "+" in "100+" is absent
                until the dot drops onto it and morphs into the plus. */}
            <div
              data-lead
              className="pointer-events-none absolute inset-x-0 top-[72%] flex -translate-y-1/2 flex-col items-center text-center"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-purple">
                Leadership
              </span>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
                Led by 100
                <span data-plus className="inline-block align-baseline">
                  +
                </span>{" "}
                years of combined experience
              </h2>
              <p className="mt-5 max-w-xl text-lg text-charcoal/70">
                Nurturing a culture that supports people — and clients.
              </p>
            </div>

            {/* The vertical trail the dot draws as it falls — a thin dashed
                line that fades out toward the top, like a comet tail. Position,
                height and the draw-down are driven by GSAP. */}
            <span
              data-trail
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-30 block w-[2px]"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, var(--color-ink) 0 5px, transparent 5px 13px)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, #000 45%)",
                maskImage: "linear-gradient(to bottom, transparent, #000 45%)",
              }}
            />

            {/* The horizontal (left) trail the dot draws as it slides across —
                same dashed comet tail, fading toward the photo side. */}
            <span
              data-trail-h
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-30 block h-[2px]"
              style={{
                background:
                  "repeating-linear-gradient(to right, var(--color-ink) 0 5px, transparent 5px 13px)",
                WebkitMaskImage:
                  "linear-gradient(to left, transparent, #000 45%)",
                maskImage: "linear-gradient(to left, transparent, #000 45%)",
              }}
            />

            {/* The travelling black dot: falls from the photo's spot onto the
                "+" slot in "100+" and morphs into the plus. Uses the heading's
                ink colour so the hand-off from circle to glyph is seamless. */}
            <span
              data-dot
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-40 block size-[12px] rounded-full bg-ink"
            />
          </div>
        </Container>
      </div>
      </div>
    </>
  );
}
