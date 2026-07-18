import { Container } from "@/components/ui/Container";
import { CountUp } from "@/components/anim/CountUp";

const stats = [
  { value: 60, suffix: "+", label: "Years combined leadership experience" },
  { value: 6, suffix: "", label: "Industries served" },
  { value: 3, suffix: "Ds", label: "Framework: Discover, Design, Deliver" },
  { value: 100, suffix: "%", label: "People-centric, always" },
];

export function Stats() {
  return (
    <section className="bg-ink py-16 text-white">
      <Container size="wide">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-5xl font-extrabold tracking-tight">
                <span className="text-gradient">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </span>
              </div>
              <p className="mt-2 text-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
