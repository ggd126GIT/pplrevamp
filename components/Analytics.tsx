"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSessionId } from "@/lib/analytics/session";

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const payload = JSON.stringify({
        sessionId,
        path: pathname,
        query: window.location.search,
        referrer: document.referrer || null,
      });

      // sendBeacon survives the page being unloaded and never blocks nav.
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" }),
      );
    } catch {
      // Analytics must never break the page.
    }
  }, [pathname]);

  return null;
}
