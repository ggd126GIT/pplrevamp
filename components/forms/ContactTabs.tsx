"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ContactForm } from "./ContactForm";
import { DiscoveryForm } from "./DiscoveryForm";

const tabs = [
  { key: "message", label: "Send a message" },
  { key: "consultation", label: "Schedule a consultation" },
] as const;

export function ContactTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("message");

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-7 inline-flex rounded-full bg-mist p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5",
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
