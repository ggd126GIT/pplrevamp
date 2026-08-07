"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CONSENT_EVENT,
  type ConsentChoice,
  clearConsent,
  readConsent,
  writeConsent,
} from "@/lib/consent";

/**
 * Expire the cookies Google set, so withdrawing consent actually removes them
 * rather than just stopping new events. They are host-only cookies on the
 * registrable domain, so both the exact host and the dot-prefixed parent are
 * cleared — missing either leaves a live cookie behind.
 */
function clearGaCookies() {
  const parts = window.location.hostname.split(".");
  const domains = [
    window.location.hostname,
    parts.length > 2 ? `.${parts.slice(-2).join(".")}` : `.${parts.join(".")}`,
  ];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !/^_ga/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Asks once, on first visit, whether Google Analytics may set cookies.
 *
 * Accept and Decline are given equal visual weight on purpose. A banner where
 * refusing is harder than accepting is not freely given consent, which is the
 * standard the DPA expects and the reason a "dismiss" X is not offered here.
 *
 * The site's own analytics are cookieless and unaffected by this choice; the
 * copy says so, because a banner that implies all measurement stops is simply
 * inaccurate.
 */
export function CookieConsent() {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const sync = () => setAsking(readConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  const choose = useCallback((choice: ConsentChoice) => {
    writeConsent(choice);
    if (choice === "denied") clearGaCookies();
    setAsking(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }, []);

  if (!asking) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[90] p-4"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-xl sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm leading-relaxed text-charcoal">
          We&apos;d like to set analytics cookies to understand how visitors use
          this site. Our own traffic measurement is cookieless and runs either
          way — this is only about Google Analytics. See our{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-purple underline underline-offset-2 hover:no-underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="flex-1 rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-mist sm:flex-none"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="flex-1 rounded-full border border-purple/40 bg-purple/5 px-5 py-2.5 text-sm font-semibold text-purple transition-colors hover:bg-purple/10 sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Footer entry point for changing your mind. Consent that cannot be withdrawn
 * as easily as it was given does not meet the standard, so this clears the
 * stored choice and the cookies, which brings the banner straight back.
 */
export function CookieSettingsButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        clearConsent();
        clearGaCookies();
        window.dispatchEvent(new Event(CONSENT_EVENT));
      }}
    >
      Cookie settings
    </button>
  );
}
