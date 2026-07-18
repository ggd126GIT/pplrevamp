import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-5 py-6 sm:px-8">
        <Logo className="text-2xl" />
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink px-5 text-center text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(50% 60% at 20% 20%, rgba(147,82,161,0.5), transparent 60%), radial-gradient(50% 60% at 85% 80%, rgba(253,146,36,0.35), transparent 60%)",
          }}
        />
        <div className="relative">
          <p className="hero-glow font-display text-7xl font-extrabold sm:text-9xl">
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
            This page took a different journey.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-white/70">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
            Let&apos;s get you back on track.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href="/" size="lg">
              Back to Home
            </Button>
            <Button
              href="/contact"
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:border-white hover:bg-white/10"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
