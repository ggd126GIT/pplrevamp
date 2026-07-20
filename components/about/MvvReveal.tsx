"use client";

import { Fragment, useEffect, useRef } from "react";
import { Target, Eye, Heart } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const mvv = [
  {
    title: "Mission",
    icon: Target,
    body: "We are committed to help our clients achieve their business goals by harnessing the power of human connections — collaborating with our professionals to deliver excellent results. We will listen and provide the right support. To our people, we strive for a positive employee experience that opens opportunities while having fun.",
  },
  {
    title: "Vision",
    icon: Eye,
    body: "We envision .ppl Solutions, Inc. to be the partner of choice for clients looking for market-leading solutions and employees seeking to develop their careers. We believe that everyone has the right to be supported — and we want that experience to be easy, convenient, cost-effective, and fully satisfied.",
  },
  {
    title: "Values",
    icon: Heart,
    body: "We are a people-centric company committed to a positive work environment for everyone. We respect our people and their ideas, enable collaboration, and inspire innovation. We are customer-focused and agile, always driven to excel. We lead by example and with empathy, and we teach our people to always act with integrity.",
  },
];

/**
 * Mission / Vision / Values — a light scroll-reveal. As the section enters (just
 * as the leadership panel scrolls away above it), the heading rises in and three
 * dashed comet trails drop from above each card, each delivering its icon —
 * Target, Eye, Heart — which pops in on landing. The title then TYPES out beside
 * its icon, and the body rises in. Echoes the AboutIntro "+" trail; the whole
 * block also drifts up slightly for a parallax feel.
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
            <div className="grid gap-7 pt-16 md:grid-cols-3">
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
                    <p
                      data-body
                      className="mt-5 leading-relaxed text-charcoal/75"
                    >
                      {item.body}
                    </p>
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
        </div>
      </Container>
    </section>
  );
}
