"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4, loaded only once the visitor has accepted cookies.
 *
 * Mounted in the public site layout, never the root layout, so it cannot follow
 * staff into /admin, /login or the /preview routes.
 *
 * Leaving NEXT_PUBLIC_GA_MEASUREMENT_ID unset disables it entirely — that is
 * how staging and local development stay out of the reporting property. Note
 * the value is inlined at BUILD time, so changing it needs a rebuild.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const [granted, setGranted] = useState(false);

  // The banner writes the choice and fires CONSENT_EVENT; listening means
  // accepting starts tracking immediately rather than on the next navigation.
  useEffect(() => {
    const sync = () => setGranted(readConsent() === "granted");
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // `config` runs with send_page_view:false, so every view — including the
  // first — is sent from here. Otherwise the initial load double-counts and
  // client-side navigations are never counted at all.
  useEffect(() => {
    if (!granted || !GA_ID) return;
    // Queue into dataLayer even if gtag.js has not finished loading; that array
    // IS gtag's queue, and it is drained on load. Without the shim the first
    // page_view after accepting is silently dropped.
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer!.push(args);
      };
    }
    window.gtag("event", "page_view", {
      page_path: `${pathname}${window.location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [granted, pathname]);

  if (!GA_ID || !granted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent','default',{
            ad_storage:'denied',
            ad_user_data:'denied',
            ad_personalization:'denied',
            analytics_storage:'granted'
          });
          gtag('js', new Date());
          gtag('config','${GA_ID}',{send_page_view:false});
        `}
      </Script>
    </>
  );
}
