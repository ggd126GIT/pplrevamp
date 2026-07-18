import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join .ppl Solutions, Inc. — the playground of the best people. Open roles are coming soon.",
};

// NOTE: Day 2 replaces this with the dynamic jobs listing from Supabase.
export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Join the playground of the best .ppl"
        intro="We open doors of opportunity through the right training and development. Our roles listing is on its way."
      />
      <Section bg="white">
        <Container size="narrow" className="text-center">
          <p className="text-lg leading-relaxed text-charcoal/75">
            We&apos;re preparing our open positions. In the meantime, tell us
            about yourself — we&apos;d love to hear from driven, outstanding
            people.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/contact" size="lg">
              Get in Touch
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
