"use client";

import { useState } from "react";
import { Headset, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { frontOffice, backOffice } from "@/lib/content";

type Key = "front" | "back";

const CATEGORIES: {
  key: Key;
  label: string;
  icon: LucideIcon;
  subtitle: string;
  blurb: string;
  items: { title: string; icon: LucideIcon; blurb: string }[];
}[] = [
  {
    key: "front",
    label: "Front-office services",
    icon: Headset,
    subtitle: "Contact Center as a Service",
    blurb:
      "Front-office outsourcing (widely known as call center services) is what the country was initially known for. The BPO industry has evolved to Contact Center as a Service (CCaS), providing a wider platform of support to customers.",
    items: frontOffice,
  },
  {
    key: "back",
    label: "Back-office services",
    icon: Building2,
    subtitle: "The backbone of your operations",
    blurb:
      "A strong and solid back office often results in quality improvement. It supports companies by optimizing resources to pursue growth opportunities, develop competencies further, and improve business strategies. Most of these services require limited to no direct customer interaction.",
    items: backOffice,
  },
];

export function ServicesToggle() {
  const [active, setActive] = useState<Key>("front");
  const cat = CATEGORIES.find((c) => c.key === active)!;
  const dark = active === "back";

  return (
    <section
      className={cn(
        "py-20 transition-colors duration-500 sm:py-28",
        dark ? "bg-ink" : "bg-cream",
      )}
    >
      <Container size="wide">
        <SectionHeading
          eyebrow="What we do"
          title="Front & back office services"
          subtitle="Pick a side — we power both ends of your operations."
          className={cn(dark && "[&_h2]:text-white [&_p]:text-white/70")}
        />

        {/* Segmented toggle — two equal halves */}
        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Service type"
            className={cn(
              "grid w-full max-w-xl grid-cols-2 gap-1 rounded-full p-1 transition-colors duration-500",
              dark ? "bg-white/10" : "bg-mist",
            )}
          >
            {CATEGORIES.map((c) => {
              const TabIcon = c.icon;
              const selected = active === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(c.key)}
                  className={cn(
                    "flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                    selected
                      ? "bg-purple text-white shadow-sm"
                      : dark
                        ? "text-white/60 hover:text-white"
                        : "text-charcoal/70 hover:text-ink",
                  )}
                >
                  <TabIcon className="size-4 shrink-0" strokeWidth={1.8} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Centred description, then the cards stacked below in two columns.
            Both blocks are keyed to `active` so they re-mount and replay the
            fade-in each time the toggle switches. */}
        <div
          key={`intro-${cat.key}`}
          className="svc-panel-in mx-auto mt-14 max-w-2xl text-center"
        >
          <h3
            className={cn(
              "text-2xl font-bold sm:text-3xl",
              dark ? "text-white" : "text-ink",
            )}
          >
            {cat.subtitle}
          </h3>
          <p
            className={cn(
              "mt-4 leading-relaxed",
              dark ? "text-white/70" : "text-charcoal/75",
            )}
          >
            {cat.blurb}
          </p>
        </div>

        {/* Two columns; an odd final card (back-office has five) centres on its
            own row via flex-wrap + justify-center — 2, 2, then 1 in the middle. */}
        <div
          key={`cards-${cat.key}`}
          className="svc-panel-in mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-5"
        >
          {cat.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.title}
                className="flex w-full sm:w-[calc(50%-0.625rem)]"
              >
                <div
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1",
                    dark
                      ? "border-white/10 bg-white/[0.05] hover:shadow-xl hover:shadow-black/30"
                      : "border-black/[0.06] bg-white hover:shadow-xl hover:shadow-purple/10",
                  )}
                >
                  {/* Icon aligned on one row with the bold title (as on About) */}
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-grad-from/12 to-grad-to/12",
                        dark ? "text-purple-light" : "text-purple",
                      )}
                    >
                      <ItemIcon className="size-6" strokeWidth={1.6} />
                    </span>
                    <h4
                      className={cn(
                        "text-lg font-bold leading-tight",
                        dark ? "text-white" : "text-ink",
                      )}
                    >
                      {item.title}
                    </h4>
                  </div>
                  <p
                    className={cn(
                      "mt-4 text-sm leading-relaxed",
                      dark ? "text-white/70" : "text-charcoal/75",
                    )}
                  >
                    {item.blurb}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
