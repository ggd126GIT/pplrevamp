"use client";

import { useCallback, useRef } from "react";
import { queueEvent } from "@/lib/analytics/events";

/**
 * Fires one `form_start` the first time a visitor actually types into a lead
 * form, and never again for that mount.
 *
 * Why it matters: with submissions and no `form_start`, a zero conversion rate
 * is unreadable — you cannot tell "nobody reached the form" from "people reach
 * it and give up". Those need opposite fixes, so the funnel needs the step in
 * between.
 *
 * Deliberately on input rather than focus: focus fires when a visitor tabs
 * through or clicks by accident, which would inflate starts and make the form
 * look worse than it is.
 */
export function useFormStart(formName: string) {
  const fired = useRef(false);

  return useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    queueEvent("form_start", formName, window.location.pathname);
  }, [formName]);
}
