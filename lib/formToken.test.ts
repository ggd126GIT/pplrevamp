import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  issueFormToken,
  verifyFormToken,
  MIN_FILL_MS,
  MAX_TOKEN_AGE_MS,
} from "./formToken";

const NOW = 1_770_000_000_000;

beforeEach(() => {
  vi.stubEnv("FORM_TOKEN_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("issueFormToken", () => {
  it("returns null when no secret is configured", () => {
    vi.stubEnv("FORM_TOKEN_SECRET", "");
    expect(issueFormToken(NOW)).toBeNull();
  });

  it("embeds the issue time so the server needs no stored state", () => {
    expect(issueFormToken(NOW)).toMatch(new RegExp(`^${NOW}\\.[0-9a-f]{64}$`));
  });
});

describe("verifyFormToken", () => {
  it("is disabled when no secret is configured", () => {
    // Mirrors the Turnstile pattern: the feature ships inert so it can be
    // deployed before the secret exists without breaking any form.
    vi.stubEnv("FORM_TOKEN_SECRET", "");
    expect(verifyFormToken("anything", NOW)).toEqual({ ok: true, reason: "disabled" });
  });

  it("accepts a token once the minimum fill time has passed", () => {
    const token = issueFormToken(NOW)!;
    expect(verifyFormToken(token, NOW + MIN_FILL_MS)).toEqual({
      ok: true,
      reason: "verified",
    });
  });

  it("rejects a submission that arrives faster than a human could type", () => {
    const token = issueFormToken(NOW)!;
    expect(verifyFormToken(token, NOW + MIN_FILL_MS - 1)).toEqual({
      ok: false,
      reason: "too-fast",
    });
  });

  it("rejects a token reused past its maximum age", () => {
    // Stateless tokens cannot be single-use, so an expiry is what stops one
    // harvested token from feeding a bot indefinitely.
    const token = issueFormToken(NOW)!;
    expect(verifyFormToken(token, NOW + MAX_TOKEN_AGE_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a token whose timestamp was edited to look older", () => {
    // The whole point of signing: a bot must not be able to backdate its own
    // token to walk past the minimum fill time.
    const token = issueFormToken(NOW)!;
    const signature = token.split(".")[1];
    const backdated = `${NOW - 60_000}.${signature}`;
    expect(verifyFormToken(backdated, NOW)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueFormToken(NOW)!;
    vi.stubEnv("FORM_TOKEN_SECRET", "other-secret");
    expect(verifyFormToken(token, NOW + MIN_FILL_MS)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("rejects a missing or non-string token", () => {
    expect(verifyFormToken(undefined, NOW)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken("", NOW)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken("   ", NOW)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken(12345, NOW)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a malformed token instead of throwing", () => {
    expect(verifyFormToken("no-separator", NOW)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifyFormToken("notanumber.abc123", NOW)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifyFormToken(`${NOW}.`, NOW)).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a token issued in the future", () => {
    // A clock-skew fudge would also let a bot mint a token that never expires.
    const token = issueFormToken(NOW + 60_000)!;
    expect(verifyFormToken(token, NOW)).toEqual({ ok: false, reason: "too-fast" });
  });
});
