"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { leaders, portraitAlt, type Leader } from "@/lib/leadership";

// lucide-react v1 dropped brand logos, so the LinkedIn mark is inlined (same
// path the footer uses).
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/**
 * Leadership showcase — an overlapping "fan" of the five leaders. One person is
 * focused at a time: they sit large, in colour, at the centre; everyone else is
 * smaller, greyscale and set back. Hover previews colour; clicking a portrait
 * moves that person to the centre (swapping places with whoever was there) and
 * updates the profile panel below. Joey is focused by default.
 *
 * Motion is pure CSS transitions on transform/filter (no GSAP pin), so it stays
 * clear of the ScrollTrigger pin/unmount issue and honours reduced-motion.
 */

const CENTER_SLOT = 2;

// Per-slot placement in the fan. Slot 2 is the focused centre: largest, in
// front. Slots step outward, smaller and set back as they go.
const SLOTS = [
  { x: "-27rem", y: "3.2rem", scale: 0.58, z: 10 }, // 0 far left, back
  { x: "-15rem", y: "1.4rem", scale: 0.78, z: 20 }, // 1 mid left
  { x: "0rem", y: "0rem", scale: 1.12, z: 40 }, //     2 centre, front
  { x: "15rem", y: "1.4rem", scale: 0.78, z: 20 }, //  3 mid right
  { x: "27rem", y: "3.2rem", scale: 0.58, z: 10 }, //  4 far right, back
];

export function LeadershipShowcase() {
  // slotOf[i] = which slot leader i currently occupies. Identity to start, so
  // the array order is the initial arrangement and Joey (index 2) is centred.
  const [slotOf, setSlotOf] = useState<number[]>(() =>
    leaders.map((_, i) => i),
  );

  const focusedIndex = slotOf.indexOf(CENTER_SLOT);
  const focused = leaders[focusedIndex];

  // Move a leader to the centre, swapping places with the current centre.
  const focus = (i: number) => {
    if (slotOf[i] === CENTER_SLOT) return;
    setSlotOf((prev) => {
      const next = [...prev];
      const current = prev.indexOf(CENTER_SLOT);
      next[current] = prev[i];
      next[i] = CENTER_SLOT;
      return next;
    });
  };

  return (
    <>
      {/* Hidden on desktop-motion — the AboutIntro sequence lands this same
          heading. Shown on mobile / reduced-motion where that stage is off. */}
      <div className="about-lead-fallback">
        <SectionHeading
          eyebrow="Leadership"
          title="Led by 100+ years of combined experience"
          subtitle="Nurturing a culture that supports people — and clients."
        />
      </div>

      {/* ---------- Desktop: interactive fan ---------- */}
      <div className="hidden lg:block">
        <div className="relative mx-auto h-[27rem] max-w-6xl">
          {leaders.map((leader, i) => {
            const slot = SLOTS[slotOf[i]];
            const isFocused = slotOf[i] === CENTER_SLOT;
            // The focused (front) person shows their full image — no fade —
            // so they read as solidly in front. Only the back people get the
            // bottom gradient so their cropped torsos dissolve softly.
            const mask = isFocused
              ? "none"
              : "linear-gradient(to bottom, #000 66%, transparent 100%)";
            return (
              <button
                key={leader.name}
                type="button"
                onClick={() => focus(i)}
                aria-pressed={isFocused}
                aria-label={`Show ${leader.name}`}
                style={{
                  transform: `translateX(calc(-50% + ${slot.x})) translateY(${slot.y}) scale(${slot.scale})`,
                  zIndex: slot.z,
                }}
                className="group absolute bottom-0 left-1/2 aspect-square w-[22rem] origin-bottom cursor-pointer transition-[transform,filter] duration-500 ease-out will-change-transform focus:outline-none motion-reduce:transition-none"
              >
                <span
                  className={`relative block h-full w-full transition-[filter,opacity] duration-500 motion-reduce:transition-none ${
                    isFocused
                      ? "opacity-100 grayscale-0 drop-shadow-[0_20px_38px_rgba(35,43,49,0.30)]"
                      : "opacity-95 grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0"
                  }`}
                  style={{ WebkitMaskImage: mask, maskImage: mask }}
                >
                  <Image
                    src={leader.photo}
                    alt={portraitAlt(leader)}
                    fill
                    sizes="394px"
                    priority={i === CENTER_SLOT}
                    className="object-contain object-bottom"
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Profile panel — cross-fades on focus change (keyed remount). */}
        <div key={focused.name} className="about-lead-panel mx-auto mt-4 max-w-xl text-center">
          <h3 className="font-display text-2xl font-extrabold text-ink">
            {focused.name}
          </h3>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-purple">
            {focused.title}
          </p>
          {/* Narrower than the panel so centred lines stay readable (~55
              characters) and the block reads as deliberate rather than flush
              to the edges. No min-height: it kept the panel a stable height
              but left a 50-80px hole under the shorter bios, which shows
              every time, whereas the height change only shows while switching
              between leaders. */}
          <div className="mx-auto mt-4 max-w-md space-y-3">
            {focused.bio.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-charcoal/75">
                {paragraph}
              </p>
            ))}
          </div>
          <a
            href={focused.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${focused.name} on LinkedIn`}
            className="mt-5 inline-flex size-10 items-center justify-center rounded-full bg-purple/10 text-purple transition-colors hover:bg-purple hover:text-white"
          >
            <LinkedInIcon className="size-5" />
          </a>
        </div>
      </div>

      {/* ---------- Mobile / reduced-motion: stacked cards ---------- */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:hidden">
        {leaders.map((leader) => (
          <MobileLeaderCard key={leader.name} leader={leader} />
        ))}
      </div>
    </>
  );
}

/** Roughly the number of characters that fit in the clamped 4 lines on the
 *  narrowest card, below which collapsing would hide nothing. */
const CLAMP_BUDGET = 150;

/**
 * One leader on mobile. The full bios run 500-750 characters, which stacked
 * five deep made the section about 3,400px of scrolling — so the bio is
 * clamped to four lines behind a Read more toggle. Photo, name, title and the
 * LinkedIn link stay visible, keeping the team scannable at a glance.
 */
function MobileLeaderCard({ leader }: { leader: Leader }) {
  const [expanded, setExpanded] = useState(false);
  const bioId = `bio-${leader.name.toLowerCase().replace(/\W+/g, "-")}`;

  // A short single-paragraph bio fits inside the clamp, so a toggle that
  // reveals nothing would just be noise.
  const collapsible = leader.bio.length > 1 || leader.bio[0].length > CLAMP_BUDGET;

  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
      <div className="relative size-28 overflow-hidden rounded-full bg-gradient-to-br from-grad-from/10 to-grad-to/10 ring-1 ring-black/5">
        <Image
          src={leader.photo}
          alt={portraitAlt(leader)}
          fill
          sizes="112px"
          className="object-cover object-top"
        />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{leader.name}</h3>
      <p className="mt-1 text-sm font-medium text-purple">{leader.title}</p>

      <div
        id={bioId}
        className="mt-3 w-full space-y-2 text-sm leading-relaxed text-charcoal/70"
      >
        {collapsible && !expanded ? (
          <p className="line-clamp-4">{leader.bio[0]}</p>
        ) : (
          leader.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        )}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={bioId}
          className="mt-2 py-1.5 text-sm font-semibold text-purple hover:underline"
        >
          {expanded ? "Read less" : "Read more"}
          <span className="sr-only"> about {leader.name}</span>
        </button>
      )}

      <a
        href={leader.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${leader.name} on LinkedIn`}
        className="mt-4 inline-flex size-9 items-center justify-center rounded-full bg-purple/10 text-purple transition-colors hover:bg-purple hover:text-white"
      >
        <LinkedInIcon className="size-4" />
      </a>
    </div>
  );
}
