import type { Metadata } from "next";
import { Check, Headset, Building2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";
import {
  frontOffice,
  backOffice,
  industriesSupported,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Front-office and back-office BPO services. .ppl Solutions, Inc. powers your business strategies with tailored offshoring and outsourcing solutions.",
};

function ServiceGrid({
  items,
}: {
  items: { title: string; icon: typeof Headset; blurb: string }[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Reveal key={item.title} delay={(i % 3) * 90}>
            <Card hover className="h-full">
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-grad-from/12 to-grad-to/12 text-purple">
                <Icon className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className="text-lg font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
                {item.blurb}
              </p>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="We power your business strategies"
        intro="From optimizing your business for growth to providing the right people to drive efficiency, we use our 3Ds framework to create tailored solutions that unlock the full potential of your business."
      />

      {/* What is offshoring / outsourcing */}
      <Section bg="white">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionHeading
                align="left"
                eyebrow="The basics"
                title="What is offshoring and outsourcing?"
              />
              <div className="mt-6 space-y-4 leading-relaxed text-charcoal/80">
                <p>
                  Offshoring and outsourcing is assigning or consigning some
                  aspects of business operations to a service provider in another
                  country. Businesses of any size can engage to reduce cost,
                  streamline processes, and increase efficiency and productivity
                  — giving them the opportunity to focus on other equally
                  important parts of their business.
                </p>
                <p>
                  Offshoring or outsourcing to the Philippines has become a
                  well-accepted strategy given the country&apos;s outstanding
                  track record, business recognition, and significant
                  contribution to the global industry. As more countries consider
                  the Philippines a foremost destination, this industry will
                  continue to grow and expand.
                </p>
              </div>
            </div>

            <Reveal>
              <Card className="bg-mist">
                <h3 className="text-lg font-bold text-ink">
                  Industries we support
                </h3>
                <p className="mt-2 text-sm text-charcoal/70">
                  The Philippines has extensive experience in both front-office
                  and back-office services supporting industries such as:
                </p>
                <ul className="mt-5 space-y-3">
                  {industriesSupported.map((industry) => (
                    <li key={industry} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      <span className="text-charcoal/85">{industry}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Front office */}
      <Section bg="cream">
        <Container size="wide">
          <div className="mb-12 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-purple text-white">
              <Headset className="size-6" strokeWidth={1.6} />
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple">
                Front-office services
              </span>
              <h2 className="text-2xl font-bold text-ink sm:text-3xl">
                Contact Center as a Service
              </h2>
            </div>
          </div>
          <p className="mb-10 max-w-3xl leading-relaxed text-charcoal/75">
            Front-office outsourcing (widely known as call center services) is
            what the country was initially known for. The BPO industry has
            evolved to Contact Center as a Service (CCaS), providing a wider
            platform of support to customers.
          </p>
          <ServiceGrid items={frontOffice} />
        </Container>
      </Section>

      {/* Back office */}
      <Section bg="white">
        <Container size="wide">
          <div className="mb-12 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-white">
              <Building2 className="size-6" strokeWidth={1.6} />
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-purple">
                Back-office services
              </span>
              <h2 className="text-2xl font-bold text-ink sm:text-3xl">
                The backbone of your operations
              </h2>
            </div>
          </div>
          <p className="mb-10 max-w-3xl leading-relaxed text-charcoal/75">
            A strong and solid back office often results in quality improvement.
            It supports companies by optimizing resources to pursue growth
            opportunities, develop competencies further, and improve business
            strategies. Most of these services require limited to no direct
            customer interaction.
          </p>
          <ServiceGrid items={backOffice} />
        </Container>
      </Section>

      <CtaBand
        title="Let's design your solution"
        subtitle="Tell us about your goals and our .ppl will map the right services for you."
        buttonLabel="Schedule a Consultation"
      />
    </>
  );
}
