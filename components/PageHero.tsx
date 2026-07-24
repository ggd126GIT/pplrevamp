import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PplText } from "@/components/ui/PplText";

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Optional full-bleed background photo, dimmed beneath the gradients. */
  image?: string;
}) {
  return (
    <section data-track-section="hero" className="relative overflow-hidden bg-ink text-white">
      {image && (
        <>
          {/* Background photo — dimmed so the gradients and copy stay dominant. */}
          <Image
            src={image}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="pointer-events-none select-none object-cover object-center opacity-40"
          />
          {/* Left-heavy scrim keeps the headline readable over the photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/40"
          />
        </>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(55% 60% at 12% 0%, rgba(147,82,161,0.5), transparent 60%), radial-gradient(50% 60% at 92% 30%, rgba(253,146,36,0.25), transparent 60%)",
        }}
      />
      <Container size="wide" className="relative">
        <div className="max-w-3xl py-24 sm:py-28">
          {eyebrow && (
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            <PplText>{title}</PplText>
          </h1>
          {intro && (
            <p className="mt-6 text-lg leading-relaxed text-white/75">
              <PplText>{intro}</PplText>
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
