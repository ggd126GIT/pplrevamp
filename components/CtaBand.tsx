"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PplText } from "@/components/ui/PplText";
import { cn } from "@/lib/cn";

export function CtaBand({
  title = "Do you have other questions in mind?",
  subtitle = "Send us a message today and one of our .ppl will get back to you.",
  buttonLabel = "Contact Us",
  buttonHref = "/contact",
}: {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonHref?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section data-track-section="cta" className="bg-white py-16">
      <Container size="wide">
        <div
          ref={ref}
          className={cn(
            "cta-band relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center sm:px-16",
            loaded && "is-loaded",
          )}
        >
          {/* Background photo — blurs and scales into focus as it loads in. */}
          <Image
            src="/home/ppl-landing-header.png"
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="cta-band__img pointer-events-none select-none object-cover object-center"
          />
          {/* Light scrim keeps the white copy readable over the photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-ink/25"
          />
          {/* Brand gradient glows on top of the photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(50% 60% at 20% 20%, rgba(147,82,161,0.5), transparent 60%), radial-gradient(50% 60% at 85% 80%, rgba(253,146,36,0.35), transparent 60%)",
            }}
          />
          {/* One-shot shimmer sweep — the "loading" flourish. */}
          <div
            aria-hidden
            className="cta-band__shimmer pointer-events-none absolute inset-0"
          />

          <div className="cta-band__content relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              <PplText>{title}</PplText>
            </h2>
            <p className="mt-4 text-lg text-white/75">
              <PplText>{subtitle}</PplText>
            </p>
            <div className="mt-8 flex justify-center">
              <Button href={buttonHref} size="lg" data-track-click="cta-band">
                {buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
