import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("is disabled when no secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await verifyTurnstile("any-token", "192.0.2.1");

    expect(result).toEqual({ ok: true, reason: "disabled" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-string token without calling Cloudflare", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await verifyTurnstile(undefined, "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(await verifyTurnstile("   ", "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(await verifyTurnstile(42, "192.0.2.1")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare reports as valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({ success: true })));

    expect(await verifyTurnstile("good", "192.0.2.1")).toEqual({
      ok: true,
      reason: "verified",
    });
  });

  it("rejects a token Cloudflare reports as invalid, keeping the error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      ),
    );

    expect(await verifyTurnstile("used", "192.0.2.1")).toEqual({
      ok: false,
      reason: "timeout-or-duplicate",
    });
  });

  it("sends the secret, token and client IP", async () => {
    const fetchSpy = vi.fn(async () => okResponse({ success: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await verifyTurnstile("tok", "192.0.2.1");

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("192.0.2.1");
  });

  it("omits remoteip when the IP is unknown", async () => {
    const fetchSpy = vi.fn(async () => okResponse({ success: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await verifyTurnstile("tok", "unknown");

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as URLSearchParams).has("remoteip")).toBe(false);
  });

  it("fails open when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    expect(await verifyTurnstile("tok", "192.0.2.1")).toEqual({
      ok: true,
      reason: "unreachable",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("fails open on a non-200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response),
    );

    expect(await verifyTurnstile("tok", "192.0.2.1")).toEqual({
      ok: true,
      reason: "unreachable",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
