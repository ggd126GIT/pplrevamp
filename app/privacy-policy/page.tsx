import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How .ppl Solutions, Inc. collects, uses, and protects your personal information.",
};

const sections = [
  {
    heading: "Information we collect",
    body: [
      "We collect information you provide directly to us through our contact and consultation forms, referral registrations, and job applications. This may include your name, company, designation, email address, phone number, message content, and — for job applicants — your curriculum vitae (CV) and related documents.",
      "We also collect limited technical information automatically, such as your browser type and pages visited, to help us operate and improve the website.",
    ],
  },
  {
    heading: "How we use your information",
    body: [
      "We use your information to respond to your inquiries, process consultation and referral requests, evaluate job applications, send transactional communications (such as confirmation emails), and improve our services.",
      "We do not sell your personal information. We share it only with service providers who help us operate the website and communications (for example, our email delivery and hosting providers), and only to the extent necessary to provide those services.",
    ],
  },
  {
    heading: "Data storage and security",
    body: [
      "Form submissions and uploaded documents are stored securely and access is restricted to authorized staff. Uploaded CVs are kept private and are only accessible to our recruitment team for the purpose of evaluating your application.",
      "While we take reasonable measures to protect your information, no method of transmission or storage is completely secure.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You may request access to, correction of, or deletion of the personal information we hold about you. To make a request, contact us using the details below and we will respond in accordance with applicable data protection laws.",
    ],
  },
  {
    heading: "Contact us",
    body: [
      `If you have questions about this Privacy Policy or how we handle your information, please contact us at ${site.email}.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />

      <Section bg="white">
        <Container size="narrow">
          <p className="text-sm text-charcoal/60">
            This Privacy Policy explains how {site.name} collects, uses, and
            protects your personal information when you use our website. This is
            a general template and should be reviewed by legal counsel before
            launch.
          </p>
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-xl font-bold text-ink">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-charcoal/80">
                  {section.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
