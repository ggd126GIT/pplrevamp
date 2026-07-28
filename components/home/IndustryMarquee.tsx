import { industries } from "@/lib/content";

/**
 * Full-bleed industry strip: a dark band of white marks that scrolls
 * continuously, in the style of a client-logo bar. No heading — the band reads
 * as a credential strip on its own, and a label above it only slowed the eye
 * down before it reached the names.
 *
 * The loop pauses on hover (see `.marquee-mask:hover` in globals.css) so an
 * industry can actually be read instead of chased.
 */
export function IndustryMarquee() {
  // Duplicate the set so the -50% translate loops seamlessly.
  const loop = [...industries, ...industries];

  return (
    <section
      data-track-section="industries"
      // The visible "Industry Expertise" label is gone by design, so name the
      // region for assistive tech — otherwise it is an unexplained list.
      aria-label="Industries we serve"
      className="bg-ink py-7"
    >
      <div className="marquee-mask">
        <div className="marquee-track gap-12 sm:gap-16">
          {loop.map((industry, i) => {
            const Icon = industry.icon;
            return (
              <div
                key={i}
                className="flex shrink-0 items-center gap-3 text-white"
                // The set is duplicated purely for the seamless loop; hide the
                // copy from assistive tech so each industry is announced once.
                aria-hidden={i >= industries.length}
              >
                <Icon className="size-6 shrink-0" strokeWidth={1.75} />
                <span className="whitespace-nowrap font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {industry.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
