import { afterEach, beforeEach, expect, test, vi } from "vitest";

type Beacon = { url: string; body: string };

let sent: Beacon[];

/**
 * The queue is module-scope state, so every test imports a fresh copy via
 * `vi.resetModules()` rather than relying on a reset helper the production
 * module would only exist to expose.
 */
async function loadEvents() {
  vi.resetModules();
  return import("./events");
}

beforeEach(() => {
  sent = [];
  const store = new Map<string, string>();

  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  });

  vi.stubGlobal("navigator", {
    sendBeacon: (url: string, blob: Blob) => {
      // Captured synchronously as text so assertions stay simple; the real
      // navigator serialises the Blob the same way.
      sent.push({ url, body: (blob as Blob & { __text?: string }).__text ?? "" });
      return true;
    },
  });

  // Blob.text() is async, which sendBeacon is not. Stash the payload on the
  // instance at construction so the stub above can read it synchronously.
  class TestBlob {
    __text: string;
    type: string;
    constructor(parts: string[], options?: { type?: string }) {
      this.__text = parts.join("");
      this.type = options?.type ?? "";
    }
  }
  vi.stubGlobal("Blob", TestBlob);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("queueEventNow sends the event immediately", async () => {
  const { queueEventNow } = await loadEvents();

  queueEventNow("form_start", "contact", "/contact");

  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe("/api/events");
  const payload = JSON.parse(sent[0].body);
  expect(payload.events).toEqual([
    { type: "form_start", label: "contact", path: "/contact", meta: undefined },
  ]);
});

test("queueEventNow also carries anything already waiting in the queue", async () => {
  const { queueEvent, queueEventNow } = await loadEvents();

  queueEvent("section_view", "hero", "/contact");
  queueEventNow("form_start", "contact", "/contact");

  expect(sent).toHaveLength(1);
  const payload = JSON.parse(sent[0].body);
  expect(payload.events.map((e: { label: string }) => e.label)).toEqual([
    "hero",
    "contact",
  ]);
});

test("queueEventNow empties the queue so a later flush does not resend it", async () => {
  const { queueEventNow, flush } = await loadEvents();

  queueEventNow("form_start", "contact", "/contact");
  flush();

  expect(sent).toHaveLength(1);
});

test("queueEvent alone does not send — batching is preserved for volume events", async () => {
  const { queueEvent } = await loadEvents();

  queueEvent("section_view", "hero", "/contact");
  queueEvent("click", "phone", "/contact");

  expect(sent).toEqual([]);
});
