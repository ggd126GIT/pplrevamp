import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PplText } from "@/components/ui/PplText";

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
  return (
    <section className="bg-white py-16">
      <Container size="wide">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(50% 60% at 20% 20%, rgba(147,82,161,0.5), transparent 60%), radial-gradient(50% 60% at 85% 80%, rgba(253,146,36,0.35), transparent 60%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              <PplText>{title}</PplText>
            </h2>
            <p className="mt-4 text-lg text-white/75">
              <PplText>{subtitle}</PplText>
            </p>
            <div className="mt-8 flex justify-center">
              <Button href={buttonHref} size="lg">
                {buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
