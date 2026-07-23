import { Container } from "@/components/ui/Container";
import { industries } from "@/lib/content";

export function IndustryMarquee() {
  // Duplicate the set so the -50% translate loops seamlessly.
  const loop = [...industries, ...industries];

  return (
    <section data-track-section="industries" className="border-y border-black/[0.06] bg-cream py-14">
      <Container size="wide">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.25em] text-purple">
          Industry Expertise
        </p>
      </Container>
      <div className="marquee-mask">
        <div className="marquee-track gap-4">
          {loop.map((industry, i) => {
            const Icon = industry.icon;
            return (
              <div
                key={i}
                className="flex shrink-0 items-center gap-3 rounded-full border border-black/[0.06] bg-white px-6 py-3.5 shadow-sm"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-grad-from/15 to-grad-to/15 text-purple">
                  <Icon className="size-5" />
                </span>
                <span className="whitespace-nowrap font-display text-base font-semibold text-ink">
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
