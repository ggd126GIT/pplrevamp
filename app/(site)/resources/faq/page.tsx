import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { CtaBand } from "@/components/CtaBand";
import { faqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the questions we get asked the most when looking for a trusted partner to implement offshoring and outsourcing solutions.",
};

const items: AccordionItem[] = faqs.map((f) => ({
  question: f.question,
  answer: f.answer.map((p, i) => <p key={i}>{p}</p>),
}));

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Frequently Asked Questions"
        intro="Below are answers to the questions we get asked the most when looking for a trusted partner to implement solutions."
        image="/resources/ppl-how-to-header.jpg"
      />

      <Section bg="white">
        <Container size="narrow">
          <Accordion items={items} />
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
