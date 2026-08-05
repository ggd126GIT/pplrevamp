"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ContactForm } from "./ContactForm";
import { DiscoveryForm } from "./DiscoveryForm";

const tabs = [
  { key: "message", label: "Send a message" },
  { key: "consultation", label: "Schedule a consultation" },
] as const;

export function ContactTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("message");

  // A "Schedule a Consultation" CTA elsewhere links to /contact#consultation —
  // open the consultation tab and bring the form into view when we land there.
  useEffect(() => {
    if (window.location.hash !== "#consultation") return;
    setActive("consultation");
    document
      .getElementById("form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
      {/* Full-width and shrinkable on phones: as `inline-flex`, "Schedule a
          consultation" set the row's min-content width to ~385px, and because
          grid items default to `min-width: auto` that stretched the whole
          column — pushing the page 65px wide at 320px, aside included. */}
      <div className="mb-7 flex w-full rounded-full bg-mist p-1 sm:inline-flex sm:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-5",
              active === tab.key
                ? "bg-white text-purple shadow-sm"
                : "text-charcoal/60 hover:text-charcoal",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "message" ? <ContactForm /> : <DiscoveryForm />}
    </div>
  );
}
