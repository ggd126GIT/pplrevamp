import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeroIntro } from "@/components/anim/HeroIntro";
import { Magnetic } from "@/components/anim/Magnetic";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {/* Background photo — sits beneath the gradients at low opacity so it
          reads as a subtle texture rather than a full-bleed image. */}
      <Image
        src="/home/ppl-test-header.png"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="pointer-events-none select-none object-cover object-center opacity-40"
      />
      {/* Scrim: dark on the left where the copy sits, clearing toward the right
          so the photo stays visible. Keeps the white headline readable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/40"
      />

      {/* Gradient mesh background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(60% 55% at 15% 10%, rgba(147,82,161,0.55), transparent 60%), radial-gradient(55% 50% at 88% 20%, rgba(253,146,36,0.28), transparent 60%), radial-gradient(70% 60% at 60% 100%, rgba(169,69,204,0.4), transparent 60%)",
        }}
      />
      {/* Subtle grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <Container size="wide" className="relative">
        <HeroIntro />
        <div className="flex min-h-[86vh] flex-col justify-center py-28">
          <div className="max-w-3xl">
            <h1
              data-hero="headline"
              className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Power your business strategies with{" "}
              <span className="hero-glow whitespace-nowrap">.ppl</span>
            </h1>

            <p
              data-hero="sub"
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75"
            >
              Focused on results and excellence, our people will power your BPO
              strategies like no other. Our 3Ds framework deep dives into your
              business to discover opportunities, design your solution, and
              deliver results. Partner with us today and see your plans into
              action.
            </p>

            <div
              data-hero="cta"
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Magnetic>
                <Button href="/contact" size="lg">
                  Schedule a Consultation Today
                </Button>
              </Magnetic>
              <Button href="/services" size="lg" variant="outline"
                className="border-white/30 text-white hover:border-white hover:bg-white/10"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
