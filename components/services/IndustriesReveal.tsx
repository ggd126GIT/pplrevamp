"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
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
 * "What is offshoring and outsourcing?" — the basics copy on the left, and the
 * six industries .ppl supports as a carousel on the right, one at a time.
 *
 * This was a pinned, scroll-scrubbed sequence: the section stuck to the
 * viewport and the visitor had to scroll through several screens of it to get
 * past. That is scroll-jacking — it takes the page away from the reader and
 * makes reaching the bottom of the page work. The visitor now scrolls straight
 * past at their own pace, and steps through the industries deliberately with
 * the arrows, the dots, or the arrow keys.
 *
 * One rendering at every size. The old pinned/static split existed only because
 * the animation could not run on mobile; with no pin there is nothing to gate,
 * so the duplicate markup — and the CSS that hid one half of it — is gone.
 *
 * No GSAP here. This is React state plus CSS transitions, so there is no
 * ScrollTrigger to refresh, no pin-spacer for React to trip over on navigation,
 * and nothing that can strand the content invisible if a script fails.
 */
export function IndustriesReveal() {
  const [active, setActive] = useState(0);
  const count = industryShowcase.length;

  // Wraps in both directions, so the arrows are never dead ends.
  const go = useCallback(
    (next: number) => setActive(((next % count) + count) % count),
    [count],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(active + 1);
      }
    },
    [active, go],
  );

  return (
    <section data-track-section="offshoring" className="bg-white py-20 sm:py-28">
      <Container size="wide">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
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

          <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Industries we support"
            onKeyDown={onKeyDown}
          >
            <div className="relative mx-auto aspect-square w-[min(100%,26rem)]">
              {industryShowcase.map((it, i) => {
                const current = i === active;
                return (
                  <div
                    key={it.label}
                    aria-hidden={!current}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500",
                      current ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  >
                    {/* Orbiting label ring — same colour, weight and slow spin
                        as the About photo ring. inset-[-16%] makes it 132% of
                        the circle and centres it WITHOUT a transform, leaving
                        the transform free for the revolve animation. */}
                    <svg
                      viewBox="0 0 400 400"
                      aria-hidden
                      className="about-revolve pointer-events-none absolute inset-[-16%]"
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

                    <div className="absolute inset-0 overflow-hidden rounded-full shadow-xl shadow-purple/10 ring-1 ring-black/5">
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
                );
              })}
            </div>

            {/* The live industry name sits between the arrows: around the ring
                it is decorative and hard to read, and a screen reader never
                sees it there. */}
            {/* The industry name is already spelled out around the ring, so
                showing it again between the arrows was redundant. It stays in
                the DOM as an sr-only live region: the ring is aria-hidden
                decoration, so without this the arrows would move a visitor
                between six unnamed photos with nothing announced.

                With no visible label the row can centre on its contents — the
                arrows no longer shift, because nothing between them changes
                width. */}
            <div className="mt-8 flex items-center justify-center gap-6">
              <CarouselButton
                label="Previous industry"
                onClick={() => go(active - 1)}
              >
                <ChevronLeft className="size-5" />
              </CarouselButton>

              <p aria-live="polite" className="sr-only">
                {industryShowcase[active].label}
              </p>

              <CarouselButton
                label="Next industry"
                onClick={() => go(active + 1)}
              >
                <ChevronRight className="size-5" />
              </CarouselButton>
            </div>

            <div className="mt-5 flex justify-center gap-2">
              {industryShowcase.map((it, i) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show ${it.label}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === active
                      ? "w-6 bg-purple"
                      : "w-2 bg-charcoal/20 hover:bg-charcoal/40",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-black/10 bg-white text-charcoal shadow-sm outline-none transition-colors hover:border-purple/40 hover:text-purple focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
