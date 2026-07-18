import type { Metadata } from "next";
import Image from "next/image";
import { Target, Eye, Heart, Sparkles } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Outstanding solutions delivered by amazing people. Meet the leaders behind .ppl Solutions, Inc. and our mission, vision, and values.",
};

const founders = [
  {
    name: "Joey Lianko",
    title: "Chief Operating Officer & Co-founder",
    photo: "/team/joey-lianko.png",
    body: "Joey has over 20 years of experience for Customer Service, Operations Business Management, and Workforce Management. He brings a deep understanding of contact center operations, performance management, and business improvement — allowing Joey to nurture positive vendor-client relationships with various multinational companies and clients. As a people manager, he is a strong leader who inspires the best in people and enables them to become agents of transformation.",
  },
  {
    name: "Tina Loneza",
    title: "Chief People Officer & Co-founder",
    photo: "/team/tina-loneza.png",
    body: "Tina is our resident expert for spotting exceptional talent — a seasoned HR professional with 20 years of solid experience in human resources and strategic talent acquisition. She has managed end-to-end recruitment cycles for corporate and outsourced environments, and relentlessly pursued HR expertise across training and development, employee relations, compensation and benefits, labor laws, performance management, and talent management systems. She is also equipped in handling global mobility and transitioning activities for both local and foreign talents.",
  },
];

const team = [
  {
    name: "Roschelle Del Rosario",
    title: "Head of Workforce Management & Business Intelligence",
    photo: "/team/roschelle-del-rosario.png",
  },
  {
    name: "Rafael Dayalo",
    title: "Head of Technology",
    photo: "/team/rafael-dayalo.png",
  },
  {
    name: "Karen Clarissa Porras",
    title: "Project Manager",
    photo: "/team/karen-porras.png",
  },
];

const mvv = [
  {
    title: "Mission",
    icon: Target,
    body: "We are committed to help our clients achieve their business goals by harnessing the power of human connections — collaborating with our professionals to deliver excellent results. We will listen and provide the right support. To our people, we strive for a positive employee experience that opens opportunities while having fun.",
  },
  {
    title: "Vision",
    icon: Eye,
    body: "We envision .ppl Solutions, Inc. to be the partner of choice for clients looking for market-leading solutions and employees seeking to develop their careers. We believe that everyone has the right to be supported — and we want that experience to be easy, convenient, cost-effective, and fully satisfied.",
  },
  {
    title: "Values",
    icon: Heart,
    body: "We are a people-centric company committed to a positive work environment for everyone. We respect our people and their ideas, enable collaboration, and inspire innovation. We are customer-focused and agile, always driven to excel. We lead by example and with empathy, and we teach our people to always act with integrity.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About .ppl"
        title="Outstanding solutions delivered by amazing PEOPLE."
      />

      <Section bg="white">
        <Container size="wide">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6 text-lg leading-relaxed text-charcoal/80">
              <p>
                .ppl Solutions, Inc. was built with the vision of being the
                playground of the best people. With us, we work with them and
                open doors of opportunities through the right training —
                developing them to become their best self yet. Nurturing a
                culture that supports people is what our leaders took to heart
                through their combined 100+ years of working in the industry.
              </p>
              <p>
                What this means to you as our client is that you have fun-loving,
                transformative people who are ready to take on your challenges
                and driven to deliver ultimate client and customer satisfaction.
                As your expert partner, we will guide you in your BPO
                transformation — from discovery to delivery — as you enable your
                outsourcing or offshoring strategies.
              </p>
              <p className="text-xl font-semibold text-ink">
                .ppl Solutions, Inc. is the place of the best people for
                outstanding clients.
              </p>
            </div>
            <Reveal>
              <div className="relative mx-auto aspect-square w-full max-w-md">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-grad-from/10 to-grad-to/10" />
                <Image
                  src="/about/team-highfive.png"
                  alt=".ppl Solutions team celebrating together with a high five"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-contain p-4"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Leadership */}
      <Section bg="mist">
        <Container size="wide">
          <SectionHeading
            eyebrow="Leadership"
            title="Led by 100+ years of combined experience"
            subtitle="Nurturing a culture that supports people — and clients."
          />

          {/* Co-founders — with bios */}
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {founders.map((leader, i) => (
              <Reveal key={leader.name} delay={i * 120}>
                <Card gradientTop className="h-full">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-grad-from/15 to-grad-to/15 ring-1 ring-black/5">
                      <Image
                        src={leader.photo}
                        alt={`Portrait of ${leader.name}`}
                        fill
                        sizes="80px"
                        className="object-cover object-top"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-ink">
                        {leader.name}
                      </h3>
                      <p className="text-sm font-medium text-purple">
                        {leader.title}
                      </p>
                    </div>
                  </div>
                  <p className="leading-relaxed text-charcoal/75">
                    {leader.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>

          {/* Wider leadership team */}
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {team.map((member, i) => (
              <Reveal key={member.name} delay={i * 120}>
                <Card className="h-full text-center">
                  <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-full bg-gradient-to-br from-grad-from/15 to-grad-to/15 ring-1 ring-black/5">
                    <Image
                      src={member.photo}
                      alt={`Portrait of ${member.name}`}
                      fill
                      sizes="128px"
                      className="object-cover object-top"
                    />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-purple">
                    {member.title}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Mission / Vision / Values */}
      <Section bg="white">
        <Container size="wide">
          <SectionHeading
            eyebrow="What drives us"
            title="Mission, Vision & Values"
          />
          <div className="mt-14 grid gap-7 md:grid-cols-3">
            {mvv.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 120}>
                  <Card hover className="h-full">
                    <span className="mb-5 inline-flex size-14 items-center justify-center rounded-xl bg-purple/10 text-purple">
                      <Icon className="size-7" strokeWidth={1.6} />
                    </span>
                    <h3 className="flex items-center gap-2 text-xl font-bold text-ink">
                      {item.title}
                      <Sparkles className="size-4 text-gold" />
                    </h3>
                    <p className="mt-3 leading-relaxed text-charcoal/75">
                      {item.body}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <CtaBand
        title="Ready to work with amazing .ppl?"
        subtitle="Let's talk about how we can power your business strategies."
        buttonLabel="Get in Touch"
      />
    </>
  );
}
