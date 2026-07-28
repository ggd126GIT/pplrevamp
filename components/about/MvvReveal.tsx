"use client";

import { Fragment, useEffect, useRef } from "react";
import { Target, Eye } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const mvv = [
  {
    title: "Mission",
    icon: Target,
    body: [
      "Our mission is to help our clients achieve their business goals by harnessing the power of human connection, partnering with our professionals to deliver excellent results. We are committed to listening to our clients and providing the right support at every stage of their journey.",
      "For our people, we cultivate a positive and engaging workplace that creates opportunities for growth, success, and enjoyment.",
    ],
  },
  {
    title: "Vision",
    icon: Eye,
    body: [
      "We envision .ppl Solutions, Inc. as the partner of choice for organizations seeking market-leading solutions and for professionals aspiring to grow meaningful careers.",
      "We believe everyone deserves the right support to succeed — both our clients and our people, and we strive to make that experience seamless, accessible, and rewarding.",
    ],
  },
];

/** The I.C.A.R.E acronym — one tile per letter, in order. */
const icare = [
  {
    letter: "I",
    title: "Integrity",
    body: "We uphold honesty, accountability, and strong moral principles in everything we do.",
  },
  {
    letter: "C",
    title: "Collaboration",
    body: "We believe great results come from working together.",
  },
  {
    letter: "A",
    title: "Agility",
    body: "We remain flexible and responsive in a constantly evolving business environment.",
  },
  {
    letter: "R",
    title: "Respect",
    body: "We are a people-centric organization that values every person.",
  },
  {
    letter: "E",
    title: "Excellence Through Empathy",
    body: "We strive for outstanding results while leading by example with empathy, humility, and care.",
  },
];

/**
 * Mission / Vision / Values — a light scroll-reveal. As the section enters (just
 * as the leadership panel scrolls away above it), the heading rises in and two
 * dashed comet trails drop from above each card, each delivering its icon —
 * Target, Eye — which pops in on landing. The title then TYPES out beside its
 * icon, and the body rises in. Echoes the AboutIntro "+" trail; the whole block
 * also drifts up slightly for a parallax feel.
 *
 * The I.C.A.R.E core values follow as their own band beneath the two cards: the
 * five letter tiles stagger in left-to-right once the cards have settled, so the
 * acronym reads as a sequence rather than appearing all at once.
 *
 * The sequence replays every time the section is scrolled back into view
 * (toggleActions restart / reset). Not pinned, so it's clear of the ScrollTrigger
 * pin/unmount issue. Desktop-motion only — mobile / reduced-motion just shows the
 * static cards (initial hidden states and trails are gated in CSS to `.mvv-anim`).
 */
export function MvvReveal() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const stage = el.querySelector<HTMLElement>("[data-stage]")!;
        const icons = gsap.utils.toArray<HTMLElement>("[data-icon]", el);
        const trails = gsap.utils.toArray<HTMLElement>("[data-trail]", el);
        const dots = gsap.utils.toArray<HTMLElement>("[data-dot]", el);
        const titles = gsap.utils.toArray<HTMLElement>("[data-type]", el);
        const carets = gsap.utils.toArray<HTMLElement>("[data-caret]", el);
        const bodies = gsap.utils.toArray<HTMLElement>("[data-body]", el);
        const heads = gsap.utils.toArray<HTMLElement>("[data-reveal]", el);
        const icareTiles = gsap.utils.toArray<HTMLElement>("[data-icare]", el);
        const chars = titles.map((t) =>
          gsap.utils.toArray<HTMLElement>("[data-ch]", t),
        );

        // Reveal the first `n` characters of title `i` (display toggle keeps the
        // caret trailing the last typed glyph).
        const showChars = (i: number, n: number) => {
          const cs = chars[i];
          for (let k = 0; k < cs.length; k++) {
            cs[k].style.display = k < n ? "" : "none";
          }
        };

        // Measure icon anchor points FIRST (before scaling them down), in the
        // stage's coordinate space.
        const S = stage.getBoundingClientRect();
        const anchors = icons.map((ic) => {
          const r = ic.getBoundingClientRect();
          return {
            cx: r.left - S.left + r.width / 2,
            ly: r.top - S.top + r.height / 2,
          };
        });

        // Initial states.
        anchors.forEach((a, i) => {
          gsap.set(trails[i], {
            left: a.cx,
            top: 0,
            height: a.ly,
            xPercent: -50,
            scaleY: 0,
            autoAlpha: 0,
            transformOrigin: "top center",
          });
          gsap.set(dots[i], {
            left: a.cx,
            top: 0,
            xPercent: -50,
            yPercent: -50,
            autoAlpha: 0,
          });
          gsap.set(icons[i], {
            autoAlpha: 0,
            scale: 0.2,
            transformOrigin: "50% 55%",
          });
          showChars(i, 0);
        });
        gsap.set(titles, { autoAlpha: 0 });
        gsap.set(carets, { autoAlpha: 0 });
        gsap.set(heads, { autoAlpha: 0, y: 26 });
        gsap.set(bodies, { autoAlpha: 0, y: 20 });
        gsap.set(icareTiles, { autoAlpha: 0, y: 24 });

        const typers = anchors.map(() => ({ n: 0 }));

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 78%",
            // Replay whenever the section is scrolled back into view.
            toggleActions: "restart none none reset",
          },
        });

        // Hide any already-typed characters at the very start, so a replay begins
        // clean rather than flashing the finished titles.
        tl.call(
          () => anchors.forEach((_, i) => showChars(i, 0)),
          undefined,
          0,
        );

        // Heading (eyebrow + title) rises in.
        tl.to(
          heads,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.08,
            ease: "power2.out",
          },
          0,
        );

        // Per card: trail drops → icon pops → title types → body rises in.
        anchors.forEach((a, i) => {
          const at = 0.35 + i * 0.62;
          const fall = 0.5;
          const typeDur = 0.06 * chars[i].length + 0.12;

          tl.set(trails[i], { autoAlpha: 1 }, at)
            .to(trails[i], { scaleY: 1, duration: fall, ease: "power2.in" }, at)
            .fromTo(
              dots[i],
              { autoAlpha: 1, top: 0 },
              { top: a.ly, duration: fall, ease: "power2.in" },
              at,
            )
            .to(
              icons[i],
              { autoAlpha: 1, scale: 1, duration: 0.32, ease: "back.out(1.8)" },
              at + fall,
            )
            .to(dots[i], { autoAlpha: 0, duration: 0.15 }, at + fall)
            .to(trails[i], { autoAlpha: 0, duration: 0.4 }, at + fall + 0.05)
            // Type the title beside the icon, once the icon has landed.
            .set(titles[i], { autoAlpha: 1 }, at + fall + 0.15)
            .set(carets[i], { autoAlpha: 1 }, at + fall + 0.15)
            .to(
              typers[i],
              {
                n: chars[i].length,
                duration: typeDur,
                ease: "none",
                onUpdate: () => showChars(i, Math.round(typers[i].n)),
              },
              at + fall + 0.2,
            )
            .to(
              carets[i],
              { autoAlpha: 0, duration: 0.3 },
              at + fall + 0.25 + typeDur,
            )
            // Body copy rises in.
            .to(
              bodies[i],
              { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
              at + fall + 0.3,
            );
        });

        // I.C.A.R.E tiles stagger in left-to-right once the last card has all
        // but settled (slight overlap reads better than a dead gap).
        tl.to(
          icareTiles,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.09,
            ease: "power2.out",
          },
          0.35 + (anchors.length - 1) * 0.62 + 1.1,
        );

        // Subtle upward parallax across the whole block.
        gsap.fromTo(
          el.querySelector("[data-parallax]"),
          { yPercent: 5 },
          {
            yPercent: -4,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      },
    );

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => {
      window.clearTimeout(refresh);
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      data-track-section="mvv"
      className="mvv-anim relative overflow-hidden bg-white pb-20 pt-8 sm:pb-28 sm:pt-10"
    >
      <Container size="wide">
        <div data-parallax>
          <div className="mx-auto max-w-3xl text-center">
            <span
              data-reveal
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-purple"
            >
              What drives us
            </span>
            <h2
              data-reveal
              className="text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl"
            >
              Mission, Vision &amp; Values
            </h2>
          </div>

          <div data-stage className="relative mt-14">
            <div className="mx-auto grid max-w-4xl gap-7 pt-16 md:grid-cols-2">
              {mvv.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10"
                  >
                    {/* Icon + title on one row; title types out beside the icon */}
                    <div className="flex items-center gap-4">
                      <span
                        data-icon
                        className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-purple/10 text-purple"
                      >
                        <Icon className="size-7" strokeWidth={1.6} />
                      </span>
                      <h3
                        data-type
                        className="flex items-center text-xl font-bold leading-none text-ink"
                      >
                        {item.title.split("").map((ch, k) => (
                          <span data-ch key={k}>
                            {ch}
                          </span>
                        ))}
                        <span data-caret className="ty-caret" aria-hidden />
                      </h3>
                    </div>
                    <div data-body className="mt-5 space-y-4">
                      {item.body.map((para) => (
                        <p key={para} className="leading-relaxed text-charcoal/75">
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comet trails + falling marks — one per card, positioned by GSAP
                over each icon. Hidden until the reveal drives them. */}
            {mvv.map((item, i) => (
              <Fragment key={`trail-${item.title}`}>
                <span
                  data-trail
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 z-20 block w-[2px]"
                  style={{
                    background:
                      "repeating-linear-gradient(to bottom, var(--color-purple) 0 5px, transparent 5px 12px)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom, transparent, #000 45%)",
                    maskImage:
                      "linear-gradient(to bottom, transparent, #000 45%)",
                  }}
                />
                <span
                  data-dot
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 z-30 block size-[10px] rounded-full bg-purple"
                />
              </Fragment>
            ))}
          </div>

          {/* I.C.A.R.E core values — the acronym gets its own band so each
              letter reads as part of a sequence. */}
          <div className="mt-20">
            <div className="mx-auto max-w-3xl text-center">
              <span
                data-icare
                className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-purple"
              >
                Our core values
              </span>
              <h3
                data-icare
                className="text-balance font-display text-3xl font-bold leading-tight text-ink sm:text-4xl"
              >
                I.C.A.R.E
              </h3>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {icare.map((value) => (
                <div
                  key={value.letter}
                  data-icare
                  className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10"
                >
                  <span
                    aria-hidden
                    className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-grad-from to-grad-to font-display text-xl font-extrabold text-white shadow-lg shadow-purple/20"
                  >
                    {value.letter}
                  </span>
                  <h4 className="mt-5 font-display text-lg font-bold leading-snug text-ink">
                    {value.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
                    {value.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
