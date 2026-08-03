import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit, FORM_LIMITS } from "./rateLimit";

const headers = (init: Record<string, string>) => new Headers(init);

afterEach(() => {
  vi.useRealTimers();
});

describe("FORM_LIMITS", () => {
  // Buckets are module-level, so every test needs its own key.
  const spend = (key: string, policy: { limit: number; windowMs: number }, times: number) =>
    Array.from({ length: times }, () => rateLimit(key, policy).ok);

  it("allows three contact submissions per visitor, then blocks", () => {
    // 5/minute permitted ~7,200 messages a day from one address, which is far
    // more than any real enquirer needs and plenty of room for a spam run.
    expect(spend("test-contact", FORM_LIMITS.contact, 3)).toEqual([true, true, true]);
    expect(rateLimit("test-contact", FORM_LIMITS.contact).ok).toBe(false);
  });

  it("reports how long a blocked contact visitor must wait", () => {
    spend("test-retry", FORM_LIMITS.contact, 3);
    const blocked = rateLimit("test-retry", FORM_LIMITS.contact);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(9 * 60);
    expect(blocked.retryAfter).toBeLessThanOrEqual(10 * 60);
  });

  it("lets a genuine visitor through again after the contact window", () => {
    vi.useFakeTimers();
    spend("test-window", FORM_LIMITS.contact, 3);
    expect(rateLimit("test-window", FORM_LIMITS.contact).ok).toBe(false);

    vi.advanceTimersByTime(FORM_LIMITS.contact.windowMs + 1);

    expect(rateLimit("test-window", FORM_LIMITS.contact).ok).toBe(true);
  });

  it("keeps job applications looser than enquiry forms", () => {
    // One person legitimately applies to several roles in a sitting, and a CV
    // upload is far more likely to need a retry than a text form.
    expect(spend("test-apply", FORM_LIMITS.apply, 5)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(rateLimit("test-apply", FORM_LIMITS.apply).ok).toBe(false);
    expect(FORM_LIMITS.apply.windowMs).toBeLessThan(FORM_LIMITS.contact.windowMs);
  });

  it("holds the discovery form to the same policy as contact", () => {
    // Both land in the same sales inbox, so a bot must not be able to route
    // around the tighter limit by posting to the other one.
    expect(FORM_LIMITS.discovery).toEqual(FORM_LIMITS.contact);
  });
});

describe("clientIp", () => {
  it("prefers cf-connecting-ip above all else", () => {
    // Cloudflare sets this itself and strips any client-supplied copy, so it is
    // the most trustworthy source once the domain is proxied.
    expect(
      clientIp(
        headers({
          "cf-connecting-ip": "198.51.100.7",
          "x-real-ip": "192.0.2.9",
          "x-forwarded-for": "203.0.113.1, 192.0.2.9",
        }),
      ),
    ).toBe("198.51.100.7");
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    // nginx sets X-Real-IP from $remote_addr, which the real_ip module has
    // already rewritten to the true client address.
    expect(
      clientIp(
        headers({
          "x-real-ip": "192.0.2.9",
          "x-forwarded-for": "203.0.113.1, 192.0.2.9",
        }),
      ),
    ).toBe("192.0.2.9");
  });

  it("ignores a forged x-forwarded-for when a trusted header is present", () => {
    // The regression this suite exists for: nginx APPENDS the real address to a
    // client-supplied XFF rather than replacing it, so trusting the first entry
    // let anyone reset their own rate-limit bucket with one extra header.
    const forged = headers({
      "x-forwarded-for": "203.0.113.55",
      "x-real-ip": "192.0.2.9",
    });
    expect(clientIp(forged)).not.toBe("203.0.113.55");
    expect(clientIp(forged)).toBe("192.0.2.9");
  });

  it("falls back to the first x-forwarded-for entry when nothing better exists", () => {
    // Still needed for Vercel, which populates XFF but not X-Real-IP on every path.
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.1, 192.0.2.9" }))).toBe(
      "203.0.113.1",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(clientIp(headers({ "x-real-ip": "  192.0.2.9  " }))).toBe("192.0.2.9");
    expect(clientIp(headers({ "x-forwarded-for": " 203.0.113.1 , 192.0.2.9" }))).toBe(
      "203.0.113.1",
    );
  });

  it("skips blank values instead of returning an empty string", () => {
    // An empty bucket key would silently pool every blank-header caller together.
    expect(clientIp(headers({ "cf-connecting-ip": "   ", "x-real-ip": "192.0.2.9" }))).toBe(
      "192.0.2.9",
    );
    expect(clientIp(headers({ "x-forwarded-for": " , 192.0.2.9" }))).toBe("192.0.2.9");
  });

  it("returns 'unknown' when no source header is present", () => {
    expect(clientIp(headers({}))).toBe("unknown");
    expect(clientIp(headers({ "x-forwarded-for": "  " }))).toBe("unknown");
  });
});
