import { getSessionId } from "@/lib/analytics/session";

export type QueuedEvent = {
  type: "section_view" | "click";
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
