"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { industryShowcase } from "@/lib/content";

const P1 =
  "Offshoring and outsourcing is assigning or consigning some aspects of business operations to a service provider in another country. Businesses of any size can engage to reduce cost, streamline processes, and increase efficiency and productivity — giving them the opportunity to focus on other equally important parts of their business.";

const P2 =
  "Offshoring or outsourcing to the Philippines has become a well-accepted strategy given the country's outstanding track record, business recognition, and significant contribution to the global industry. The Philippines has extensive experience across both front-office and back-office services, supporting industries such as:";

/** Build the orbiting ring text for a label — repeat it (with a middot
 * separator, as on About) enough times to fill the circular path so short
 * names like "Healthcare" don't leave a big gap. `textLength` + `lengthAdjust`
 * then stretch it to sit flush around the ring. */
const RING_TARGET = 78; // ≈ chars around the path at 23px (matches About)
function ringLabel(label: string): string {
  const unit = `${label} · `;
  const reps = Math.max(2, Math.round(RING_TARGET / unit.length));
  return unit.repeat(reps);
}

/**
 * "What is offshoring and outsourcing?" — the basics copy stays fixed on the
 * left while the right side plays a pinned scroll sequence through the six
 * industries .ppl supports. Each circular photo opens from the centre with a
 * linear horizontal wipe; the previous circle fades out as the next one wipes
 * in (a single-focus hand-off). Every frame is the same full size. Each circle
 * carries its own revolving ring of the industry name — same purple, weight
 * and slow spin as
 * the About photo ring — which fades in with the photo. A row of step dots
 * tracks progress.
 *
 * Gated by CSS (.svc-reveal-stage) — the static two-column layout in
 * .svc-reveal-static renders on mobile / reduced motion instead.
 */
export function IndustriesReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);

    const left = q("[data-svc-left]");
    const items = q<HTMLElement>("[data-svc-item]");
    const imgs = q<HTMLElement>("[data-svc-img]");
    const rings = q<HTMLElement>("[data-svc-ring]");
    const dots = q<HTMLElement>("[data-svc-dot]");

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const N = imgs.length;

        // Initial states. Every photo starts clipped shut at its centre and
        // every ring hidden; the sequence brings each pair forward in turn.
        gsap.set(left, { autoAlpha: 0, y: 24 });
        gsap.set(items, { autoAlpha: 1 });
        gsap.set(imgs, { clipPath: "inset(0% 50% 0% 50%)" });
        gsap.set(rings, { autoAlpha: 0 });
        gsap.set(dots, { width: 8, backgroundColor: "rgba(35,43,49,0.18)" });

        const LEAD = 0.4; // buffer so the pin settles before anything reveals
        const seg = 1; // scroll units per image
        const total = LEAD + N * seg + 0.4;

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            // One extra viewport of scroll per image so the wipes read slowly.
            end: () => "+=" + window.innerHeight * (N + 1),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
        tl.to({}, { duration: total }, 0); // fix timeline length

        // The basics copy rises in once, then holds for the whole pin.
        tl.to(left, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.6 }, 0);

        imgs.forEach((im, i) => {
          const at = LEAD + i * seg;
          // Linear wipe: opens from a centre line outward to BOTH edges (left
          // and right at once) — inset(0 50% 0 50%) → inset(0). The previous
          // circle is already dropping out (below) so this two-direction reveal
          // plays over the background rather than reading as a cross-fade.
          const revealAt = at + (i > 0 ? seg * 0.15 : 0);
          tl.to(
            im,
            { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: seg * 0.85 },
            revealAt,
          );
          // The orbiting label ring fades in alongside its photo.
          tl.to(
            rings[i],
            { autoAlpha: 1, ease: "power2.out", duration: seg * 0.45 },
            revealAt,
          );
          if (i > 0) {
            // Drop the previous circle (photo + its ring) out quickly and up
            // front so the incoming wipe reads over a clean background — and so
            // the outgoing ring doesn't linger beneath the new one.
            tl.to(
              items[i - 1],
              { autoAlpha: 0, ease: "power2.in", duration: seg * 0.3 },
              at,
            );
          }
          // Step dots — grow + colour the active one, dim the previous.
          tl.to(
            dots[i],
            {
              width: 26,
              backgroundColor: "rgba(147,82,161,1)",
              ease: "power2.out",
              duration: seg * 0.4,
            },
            at,
          );
          if (i > 0) {
            tl.to(
              dots[i - 1],
              {
                width: 8,
                backgroundColor: "rgba(35,43,49,0.18)",
                ease: "power1.in",
                duration: seg * 0.4,
              },
              at,
            );
          }
        });
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
      <section data-track-section="offshoring" className="svc-reveal-static bg-white py-20 sm:py-28">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionHeading
                align="left"
                eyebrow="The basics"
                title="What is offshoring and outsourcing?"
              />
              <div className="mt-6 space-y-4 leading-relaxed text-charcoal/80">
                <p>{P1}</p>
                <p>{P2}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
              {industryShowcase.map((it) => (
                <Reveal key={it.label}>
                  <figure className="flex flex-col items-center text-center">
                    <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-lg shadow-purple/10 ring-1 ring-black/5">
                      <Image
                        src={it.image}
                        alt={it.alt}
                        fill
                        sizes="(max-width: 640px) 50vw, 30vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="mt-3 text-xs font-semibold text-ink">
                      {it.label}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Animated pinned stage — motion-safe desktop.
          Wrapped in a stable outer <div> that GSAP never touches: ScrollTrigger's
          pin re-parents the inner stage into a .pin-spacer, so without this
          wrapper React would try to removeChild the stage from a parent it no
          longer belongs to on route change ("NotFoundError"). */}
      <div data-track-section="offshoring" className="svc-reveal-stage-wrap">
        <div
          ref={root}
          className="svc-reveal-stage min-h-screen w-full items-center overflow-hidden bg-white pt-24 pb-12"
        >
          <Container size="wide" className="relative w-full">
            <div className="grid w-full items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
              {/* Left — the basics copy, fixed for the whole sequence */}
              <div data-svc-left>
                <SectionHeading
                  align="left"
                  eyebrow="The basics"
                  title="What is offshoring and outsourcing?"
                />
                <div className="mt-6 space-y-4 leading-relaxed text-charcoal/80">
                  <p>{P1}</p>
                  <p>{P2}</p>
                </div>
              </div>

              {/* Right — the circular wipe-reveal, one industry at a time.
                  Sized by the smaller of the column width or the viewport
                  height (min(100%,52vh)) so the full 100% circle AND its
                  orbiting ring always fit between the sticky header and the
                  dots — no top clipping. */}
              <div className="relative mx-auto aspect-square w-[min(100%,50vh)] max-w-xl">
                {industryShowcase.map((it, i) => (
                  <div
                    key={it.label}
                    data-svc-item
                    className="absolute left-1/2 top-1/2 aspect-square w-full -translate-x-1/2 -translate-y-1/2"
                  >
                    {/* Orbiting label ring — same colour, weight and slow spin
                        as the About photo ring. inset-[-16%] makes it 132% of
                        the circle and centres it WITHOUT a transform, leaving
                        the transform free for the revolve animation. */}
                    <svg
                      data-svc-ring
                      viewBox="0 0 400 400"
                      aria-hidden
                      className="about-revolve pointer-events-none absolute inset-[-16%]"
                      style={{ opacity: 0 }}
                    >
                      <defs>
                        <path
                          id={`svcRing-${i}`}
                          d="M200,200 m-165,0 a165,165 0 1,1 330,0 a165,165 0 1,1 -330,0"
                          fill="none"
                        />
                      </defs>
                      <text
                        fill="#9352a1"
                        style={{ fontSize: "23px", fontWeight: 700 }}
                      >
                        <textPath
                          href={`#svcRing-${i}`}
                          startOffset="0"
                          textLength="1030"
                          lengthAdjust="spacing"
                        >
                          {ringLabel(it.label)}
                        </textPath>
                      </text>
                    </svg>

                    {/* Photo — wipes open from the centre to both edges. */}
                    <div
                      data-svc-img
                      className="absolute inset-0 overflow-hidden rounded-full shadow-xl shadow-purple/10 ring-1 ring-black/5"
                      style={{ clipPath: "inset(0% 50% 0% 50%)" }}
                    >
                      <Image
                        src={it.image}
                        alt={it.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 45vw"
                        className="object-cover"
                        priority={i === 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress dots */}
            <div className="mt-10 flex justify-center gap-2 lg:mt-8">
              {industryShowcase.map((it) => (
                <span
                  key={it.label}
                  data-svc-dot
                  aria-hidden
                  className="block h-2 rounded-full"
                  style={{ width: 8, backgroundColor: "rgba(35,43,49,0.18)" }}
                />
              ))}
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}
