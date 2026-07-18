import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on offshoring, outsourcing, and BPO from the .ppl Solutions, Inc. team. Coming soon.",
};

// NOTE: Day 2 replaces this with the dynamic blog listing (ISR) from Supabase.
export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Insights from our .ppl"
        intro="Perspectives on offshoring, outsourcing, and building high-performing teams. Our first posts are on the way."
      />
      <Section bg="white">
        <Container size="narrow" className="text-center">
          <p className="text-lg leading-relaxed text-charcoal/75">
            Check back soon for articles from the .ppl Solutions team.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/contact" size="lg" variant="outline">
              Contact Us
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
