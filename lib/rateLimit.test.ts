import { describe, expect, it } from "vitest";
import { clientIp } from "./rateLimit";

const headers = (init: Record<string, string>) => new Headers(init);

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
