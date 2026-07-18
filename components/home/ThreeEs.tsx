import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal } from "@/components/ui/Reveal";
import { threeEs } from "@/lib/content";

export function ThreeEs() {
  return (
    <section className="bg-mist py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow="The .ppl Advantage"
          title="The 3E's of partnering with .ppl"
          subtitle="Why leading businesses choose offshoring and outsourcing with us."
        />

        <div className="mt-16 grid gap-7 md:grid-cols-3">
          {threeEs.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.key} delay={i * 120}>
                <TiltCard className="h-full">
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-grad-from to-grad-to" />
                  <span className="mb-5 inline-flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-grad-from/12 to-grad-to/12 text-purple">
                    <Icon className="size-7" strokeWidth={1.6} />
                  </span>
                  <h3 className="text-xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-charcoal/75">
                    {item.short}
                  </p>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
