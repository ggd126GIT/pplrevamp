import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { IndustriesReveal } from "@/components/services/IndustriesReveal";
import { ServicesToggle } from "@/components/services/ServicesToggle";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Front-office and back-office BPO services. .ppl Solutions, Inc. powers your business strategies with tailored offshoring and outsourcing solutions.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="We power your business strategies"
        intro="From optimizing your business for growth to providing the right people to drive efficiency, we use our 3Ds framework to create tailored solutions that unlock the full potential of your business."
        image="/services/ppl-services-header.png"
      />

      {/* What is offshoring / outsourcing — pinned industry scroll-reveal */}
      <IndustriesReveal />

      {/* Front / back office — toggle between the two; the whole band
          switches to dark mode when back-office is active. */}
      <ServicesToggle />

      <CtaBand
        title="Let's design your solution"
        subtitle="Tell us about your goals and our .ppl will map the right services for you."
        buttonLabel="Schedule a Consultation"
      />
    </>
  );
}
