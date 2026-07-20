import type { Metadata } from "next";
import { UserPlus, Share2, Gift } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Referral Program",
  description:
    "Run right and staff up with .ppl Solutions, Inc. Refer and earn rewards in 3 easy steps — Register, Refer, and Reap your rewards.",
};

const steps = [
  {
    n: "1",
    title: "Register",
    icon: UserPlus,
    body: "Contact .ppl Solutions, Inc. to qualify and work as an independent contractor. Work on your own time and make as much as you want. Fill in the registration form and a .ppl manager will contact you to discuss the details of the referral program. All qualified referrers should be registered as an independent contractor.",
  },
  {
    n: "2",
    title: "Refer",
    icon: Share2,
    body: "Once the agreement has been signed and formalized, our bona fide independent contractor referrals are tagged under the referrer and referral incentives become available for the next 12 months. Conditions do apply.",
  },
  {
    n: "3",
    title: "Reap your rewards",
    icon: Gift,
    body: "Quick turnaround! Referrals are validated within 24–48 hours. .ppl Solutions, Inc. will confirm referral validity through an authorized email. The Referral Incentive is paid monthly based on the active number of staff employed through the referred company within the first 12 months. One referral and you may be paid for a year!",
  },
];

export default function ReferralPage() {
  return (
    <>
      <PageHero
        eyebrow="Referral Program"
        title="The best People is what we're all about."
        intro="Run right and staff up with .ppl Solutions, Inc. Be part of our growth — refer and earn rewards in 3 easy steps. Repeat steps 2 and 3 as often as you can."
        image="/resources/ppl-how-to-header.jpg"
      />

      <Section bg="white">
        <Container size="wide">
          <div className="grid gap-7 md:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 120}>
                  <Card gradientTop hover className="h-full">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-grad-from/12 to-grad-to/12 text-purple">
                        <Icon className="size-7" strokeWidth={1.6} />
                      </span>
                      <span className="font-display text-5xl font-extrabold text-black/[0.06]">
                        {step.n}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-ink">
                      Step {step.n}: {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
                      {step.body}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Button href="/contact" size="lg">
              Register &amp; Start Referring Today
            </Button>
          </div>
        </Container>
      </Section>

      {/* Conditions */}
      <Section bg="cream" className="py-16">
        <Container size="narrow">
          <h2 className="text-xl font-bold text-ink">Conditions apply</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-charcoal/70">
            <p>
              To be eligible for incentives, your referred company must sign a
              contract with .ppl Solutions, Inc., with at least one full-time
              staff, to be employed as a full-time employee. Employees hired
              under project or short-term engagement will not be eligible for a
              referral incentive.
            </p>
            <p>
              Referral of existing customers or leads is not considered valid.
              Referrals must be new customers who have no existing engagement
              with .ppl Solutions, Inc. Previous clients who are no longer on
              active status and have no existing project are considered valid
              referrals as long as conditions are met.
            </p>
            <p>
              Please note that validation is only for qualification purposes and
              not for the confirmation of your incentives. Contact .ppl
              Solutions, Inc. for full details.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
