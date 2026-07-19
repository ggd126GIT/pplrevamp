import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ThreeDsPinned } from "@/components/home/ThreeDsPinned";
import { threeDs } from "@/lib/content";

export function ThreeDs() {
  return (
    <section id="threeds" className="bg-white py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow="The .ppl Strategy"
          title="Our 3Ds framework"
          subtitle="A deep dive into your business — to discover opportunities, design your solution, and deliver results."
        />
      </Container>

      {/*
        Static grid: the readable fallback shown on mobile and whenever reduced
        motion is requested. `.threeds-static` is hidden by CSS exactly when the
        animated stage below is shown (motion-safe desktop).
      */}
      <Container size="wide" className="threeds-static mt-14">
        <div className="grid gap-8 lg:grid-cols-3">
          {threeDs.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="group relative">
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
      </Container>

      {/* Animated pinned sequence: motion-safe desktop only (CSS-gated). */}
      <ThreeDsPinned />
    </section>
  );
}
