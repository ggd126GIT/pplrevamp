import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ThreeEsPinned } from "@/components/home/ThreeEsPinned";
import { threeEs } from "@/lib/content";

export function ThreeEs() {
  return (
    <section
      id="threees"
      data-track-section="threees"
      className="relative z-20 -mt-24 rounded-t-[3rem] bg-mist py-20 shadow-[0_-30px_70px_-25px_rgba(147,82,161,0.35)] sm:py-28"
    >
      <Container size="wide">
        <SectionHeading
          eyebrow="The .ppl Advantage"
          title="The 3E's of partnering with .ppl"
          subtitle="Why leading businesses choose offshoring and outsourcing with us."
        />
      </Container>

      {/*
        Static grid: the readable fallback shown on mobile and whenever reduced
        motion is requested. `.threees-static` is hidden by CSS exactly when the
        animated stage below is shown (motion-safe desktop).
      */}
      <Container size="wide" className="threees-static mt-14">
        <div className="grid gap-10 sm:grid-cols-3">
          {threeEs.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.key} delay={i * 120}>
                <div className="text-center">
                  <div className="mx-auto aspect-square w-full max-w-[15rem] rounded-full bg-gradient-to-br from-grad-from to-grad-to p-[3px]">
                    <div className="relative h-full w-full overflow-hidden rounded-full bg-mist">
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        fill
                        sizes="(max-width: 640px) 80vw, 20vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-purple">
                    <Icon className="size-5" strokeWidth={1.7} />
                    <h3 className="text-xl font-bold text-ink">{item.title}</h3>
                  </div>
                  <p className="mt-2 leading-relaxed text-charcoal/75">
                    {item.short}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>

      {/* Animated pinned sequence: motion-safe desktop only (CSS-gated). */}
      <ThreeEsPinned />
    </section>
  );
}
