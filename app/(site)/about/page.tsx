import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { AboutIntro } from "@/components/about/AboutIntro";
import { LeadershipShowcase } from "@/components/about/LeadershipShowcase";
import { MvvReveal } from "@/components/about/MvvReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Outstanding solutions delivered by amazing people. Meet the leaders behind .ppl Solutions, Inc. and our mission, vision, and values.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About .ppl"
        title="Outstanding solutions delivered by amazing PEOPLE."
        image="/about/ppl-about-header.png"
      />

      <AboutIntro />

      {/* Leadership — interactive fan showcase (white bg so the white photo
          backgrounds blend into a seamless cutout arrangement). Tight top
          padding on desktop: the AboutIntro sequence already lands the heading
          just above, so the fan should sit close beneath it. */}
      <Section bg="white" className="lg:pt-0 lg:pb-8">
        <Container size="wide">
          <LeadershipShowcase />
        </Container>
      </Section>

      {/* Mission / Vision / Values — light scroll-reveal with comet-trail icons */}
      <MvvReveal />

      <CtaBand
        title="Ready to work with amazing .ppl?"
        subtitle="Let's talk about how we can power your business strategies."
        buttonLabel="Get in Touch"
      />
    </>
  );
}
