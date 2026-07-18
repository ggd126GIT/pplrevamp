import { Hero } from "@/components/home/Hero";
import { IndustryMarquee } from "@/components/home/IndustryMarquee";
import { ThreeDs } from "@/components/home/ThreeDs";
import { ThreeEs } from "@/components/home/ThreeEs";
import { Stats } from "@/components/home/Stats";
import { CtaBand } from "@/components/CtaBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <IndustryMarquee />
      <ThreeDs />
      <Stats />
      <ThreeEs />
      <CtaBand />
    </>
  );
}
