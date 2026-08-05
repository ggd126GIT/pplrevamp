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
            {/* Arrows flank the circle. The ring used to be drawn at
                inset-[-16%], spilling outside its own layout box — anything
                placed beside it got overlapped by the spinning text. The
                wrapper below is now the RING's box and the photo is inset
                within it, so the layout box matches what you see and a normal
                flex gap actually keeps the arrows clear. */}
            <div className="mx-auto flex w-full max-w-[34rem] items-center gap-1 sm:gap-3">
              <CarouselButton
                label="Previous industry"
                onClick={() => go(active - 1)}
              >
                <ChevronLeft className="size-7" />
              </CarouselButton>

              <div className="relative aspect-square min-w-0 flex-1">
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
                        as the About photo ring. It fills the wrapper, and the
                        photo is inset inside it (see below), so the ring's
                        visual bounds ARE the layout bounds. */}
                    <svg
                      viewBox="0 0 400 400"
                      aria-hidden
                      className="about-revolve pointer-events-none absolute inset-0"
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

                    {/* 12.1% — the inverse of the old -16% outset, so the photo
                        keeps exactly the size it had relative to the ring. */}
                    <div className="absolute inset-[12.1%] overflow-hidden rounded-full shadow-xl shadow-purple/10 ring-1 ring-black/5">
                      <Image
                        src={it.image}
                        alt={it.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover"
                        priority={i === 0}
                      />
                    </div>
                  </div>
                );
              })}
              </div>

              <CarouselButton
                label="Next industry"
                onClick={() => go(active + 1)}
              >
                <ChevronRight className="size-7" />
              </CarouselButton>
            </div>

            {/* The live industry name sits between the arrows: around the ring
                it is decorative and hard to read, and a screen reader never
                sees it there. */}
            {/* The ring names the industry visually but is aria-hidden
                decoration, so this is the only thing that announces a change —
                without it the arrows move a visitor between six unnamed
                photographs in silence. */}
            <p aria-live="polite" className="sr-only">
              {industryShowcase[active].label}
            </p>

            <div className="mt-6 flex justify-center gap-2">
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
    // Brand purple, and bare rather than a bordered pill — beside the circle a
    // white disc reads as a second, competing shape. size-11 keeps the tap
    // target at the 44px minimum even though the chevron is smaller, and
    // shrink-0 stops flex from squeezing it as the circle grows.
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full text-purple outline-none transition-colors hover:bg-purple/10 focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
