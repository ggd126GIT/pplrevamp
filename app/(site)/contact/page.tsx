import type { Metadata } from "next";
import { Mail, Clock, MessageSquareHeart } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ContactTabs } from "@/components/forms/ContactTabs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with .ppl Solutions, Inc. Send us a message and one of our .ppl will get back to you regarding your inquiry.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Let's power your business strategies"
        intro="Tell us about your goals. One of our .ppl will get back to you regarding your inquiry."
        image="/contact/ppl-contact-header.png"
      />

      <Section bg="white">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            {/* Contact + discovery forms */}
            <div id="form" className="scroll-mt-24">
              <ContactTabs />
            </div>

            {/* Contact info */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-black/[0.06] bg-cream p-7">
                <h2 className="text-lg font-bold text-ink">Reach us directly</h2>
                <ul className="mt-5 space-y-5 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple/10 text-purple">
                      <Mail className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">Email</p>
                      <a
                        href={`mailto:${site.email}`}
                        className="text-charcoal/70 hover:text-purple"
                      >
                        {site.email}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple/10 text-purple">
                      <Clock className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">Response time</p>
                      <p className="text-charcoal/70">
                        We typically reply within 1–2 business days.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-grad-from to-grad-to p-7 text-white">
                <MessageSquareHeart className="size-8" strokeWidth={1.6} />
                <p className="mt-4 font-display text-lg font-semibold">
                  Happy .ppl create Happy Customers.
                </p>
                <p className="mt-2 text-sm text-white/85">
                  Thank you for reaching out — we look forward to partnering with
                  you on your BPO journey.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
