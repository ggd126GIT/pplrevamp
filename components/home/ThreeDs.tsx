import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ThreeDsProgress } from "@/components/anim/ThreeDsProgress";
import { threeDs } from "@/lib/content";

export function ThreeDs() {
  return (
    <section id="threeds" className="bg-white py-20 sm:py-28" data-threeds>
      <Container size="wide">
        <SectionHeading
          eyebrow="The .ppl Strategy"
          title="Our 3Ds framework"
          subtitle="A deep dive into your business — to discover opportunities, design your solution, and deliver results."
        />

        <div className="relative mt-16">
          {/* Progress line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-black/[0.08] lg:block"
          >
            <div
              data-threeds-line
              className="h-full origin-left bg-gradient-to-r from-grad-from via-purple to-grad-to"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {threeDs.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="group relative" data-threeds-step>
                  <div className="mb-6 flex items-center gap-4">
                    <span className="relative z-10 flex size-[6.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-grad-from to-grad-to text-white shadow-lg shadow-purple/25">
                      <Icon className="size-10" strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-6xl font-extrabold text-black/[0.06]">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-charcoal/75">
                    {step.blurb}
                  </p>
                </div>
              );
            })}
          </div>

          <ThreeDsProgress />
        </div>
      </Container>
    </section>
  );
}
