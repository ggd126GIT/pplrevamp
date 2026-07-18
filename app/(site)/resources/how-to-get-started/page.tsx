import type { Metadata } from "next";
import { Search, PencilRuler, Rocket } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "How to Get Started",
  description:
    "Our 3Ds journey — Discover (Assess, Calibrate, Establish Baseline), Design, and Deliver. Here's how we power your business strategies.",
};

const discoverSteps = [
  {
    title: "Assess & understand business requirements",
    body: "Before starting your journey, it is critical to establish the business goals you need to achieve and to choose the right partner. During Discovery, the right partner works with you to understand your processes, pain points, and needs — carefully assessing goals, objectives, current and planned business models, and stakeholders. This results in risk reduction, a clear road map for implementation, and confidence in the project. The right partner should fill the gaps, answer discovery questions, and prepare an in-depth assessment and documentation, paving the way for clear and mutually agreed goals.",
  },
  {
    title: "Calibrate",
    body: "Calibration allows your company and the right partner to align on goals and objectives. It identifies opportunities and road blocks, and defines the measures for success of the project. Calibrating is the perfect opportunity to do a deep dive on your business and understand each of the following areas — people, process, technology, and even culture. Successfully completing this analysis sets the project up for success.",
  },
  {
    title: "Establish Baseline",
    body: "Establishing baseline is necessary to complete the assessment and calibration, aligning business challenges, opportunities, goals, processes, and available solutions. The right partner helps establish the baselines that are key to a successful discovery phase through to implementation. A comprehensive documentation is essential in establishing a system of compliance and governance.",
  },
];

const deliverPoints = [
  {
    title: "Establish Service Level Agreements (SLAs)",
    body: "Set out performance measures and goals. We compare these against what we consider the glide path so we can make sure we're on track.",
  },
  {
    title: "Adapt a collaborative model",
    body: "Communication is key. We'll constantly touch base, hand over tasks, align our efforts, and calibrate our approach — with clear process accountability and ownership while prioritizing a synergized approach.",
  },
  {
    title: "Establish and monitor controls",
    body: "Set up processes to ensure everything runs smoothly, keeping an eye on risk and quality monitoring. We conduct frequent, regular audits and checks to ensure we're meeting SLAs and that goals remain accurate, relevant, realistic, and achievable.",
  },
];

export default function HowToGetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="How to Get Started"
        title="Your 3Ds journey with .ppl"
        intro="Discover, Design, and Deliver — a framework built to manage pitfalls, standardize processes, and put your plans into action."
      />

      {/* Discover */}
      <Section bg="white">
        <Container size="wide">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-grad-from to-grad-to text-white shadow-lg shadow-purple/25">
              <Search className="size-7" strokeWidth={1.6} />
            </span>
            <div>
              <span className="font-display text-sm font-semibold text-purple">
                Phase 01
              </span>
              <h2 className="text-3xl font-bold text-ink">Discover</h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-relaxed text-charcoal/75">
            Our <strong>ACE</strong> approach — Assess, Calibrate, and Establish
            Baseline — assures a robust partnership and project implementation.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {discoverSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <Card gradientTop className="h-full">
                  <span className="font-display text-4xl font-extrabold text-black/[0.07]">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
                    {step.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Design */}
      <Section bg="mist">
        <Container size="wide">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-grad-from to-grad-to text-white shadow-lg shadow-purple/25">
                <PencilRuler className="size-7" strokeWidth={1.6} />
              </span>
              <div>
                <span className="font-display text-sm font-semibold text-purple">
                  Phase 02
                </span>
                <h2 className="text-3xl font-bold text-ink">Design</h2>
              </div>
            </div>
            <div className="max-w-3xl space-y-4 leading-relaxed text-charcoal/80">
              <p>
                The design phase is just as crucial as any other step. This is
                where we do the process modeling of your existing and proposed
                frameworks, based on a thorough analysis done during discovery.
                By simulating both your current and our recommended frameworks,
                we minimize risks and standardize your processes, resulting in a
                streamlined and cohesive approach.
              </p>
              <p>
                Don&apos;t worry if we need to recalibrate and re-align along the
                way — that&apos;s all part of the process. To cover all our
                bases, this phase encompasses everything from process and
                technology to people, organization, and culture.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Deliver */}
      <Section bg="white">
        <Container size="wide">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-grad-from to-grad-to text-white shadow-lg shadow-purple/25">
              <Rocket className="size-7" strokeWidth={1.6} />
            </span>
            <div>
              <span className="font-display text-sm font-semibold text-purple">
                Phase 03
              </span>
              <h2 className="text-3xl font-bold text-ink">Deliver</h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-relaxed text-charcoal/75">
            The moment we&apos;ve all been waiting for. It kicks off with a
            meeting of all stakeholders to ensure everyone is aligned and ready
            to move forward. To make sure everything runs smoothly, we put a few
            things in place:
          </p>
          <div className="mt-10 space-y-5">
            {deliverPoints.map((point, i) => (
              <Reveal key={point.title} delay={i * 90}>
                <div className="flex gap-5 rounded-2xl border border-black/[0.06] bg-cream p-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple font-display font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-charcoal/75">
                      {point.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-center font-display text-xl font-semibold text-ink">
            With all these measures in place, we&apos;re ready to power your
            business strategies.
          </p>
        </Container>
      </Section>

      <CtaBand
        title="Ready to begin your journey?"
        subtitle="Let's start with Discovery. Reach out and our .ppl will guide you."
        buttonLabel="Schedule a Consultation"
      />
    </>
  );
}
