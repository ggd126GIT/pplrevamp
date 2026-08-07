import { getSessionId } from "@/lib/analytics/session";

export type QueuedEvent = {
  type: "section_view" | "click" | "form_start";
  label: string;
  /** Recorded per event, not per batch: a flush and a route change can
   *  interleave, and a batch-level path would mislabel one page as another. */
  path: string;
  meta?: { href: string };
};

const MAX_QUEUE = 50;
let queue: QueuedEvent[] = [];

export function queueEvent(
  type: QueuedEvent["type"],
  label: string,
  path: string,
  meta?: { href: string },
): void {
  if (queue.length >= MAX_QUEUE) return;
  queue.push({ type, label, path, meta });
}

/**
 * Queues an event and sends the batch straight away.
 *
 * For the rare, high-value events the funnel turns on — `form_start` fires at
 * most once per form mount, so this costs about one extra beacon per engaged
 * session, not per page view. Two reasons it does not wait for the exit flush:
 *
 * 1. **Durability.** The exit flush hangs off `pagehide` / `visibilitychange`,
 *    and `pagehide` is unreliable on mobile Safari. Losing a `section_view` is
 *    survivable; losing the one event that separates "nobody reached the form"
 *    from "people reach it and give up" is not.
 * 2. **Accuracy.** `events.created_at` is the *insert* time, so a batched event
 *    is stamped whenever the visitor happened to leave — minutes late. Sending
 *    on occurrence makes the timestamp true without a client clock, which
 *    cannot be trusted.
 *
 * Volume events (`section_view`, `click`) stay batched via `queueEvent`.
 */
export function queueEventNow(
  type: QueuedEvent["type"],
  label: string,
  path: string,
  meta?: { href: string },
): void {
  queueEvent(type, label, path, meta);
  flush();
}

/** Sends and empties the queue. No-op when empty. Never throws. */
export function flush(): void {
  if (!queue.length) return;

  // Clear BEFORE sending: pagehide and visibilitychange can both fire for one
  // exit, and a queue still populated at that point would send twice.
  const events = queue;
  queue = [];

  try {
    const sessionId = getSessionId();
    if (!sessionId) return;
    const payload = JSON.stringify({ sessionId, events });
    navigator.sendBeacon(
      "/api/events",
      new Blob([payload], { type: "application/json" }),
    );
  } catch {
    // Analytics must never break the page.
  }
}
