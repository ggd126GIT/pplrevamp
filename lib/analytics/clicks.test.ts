import { describe, it, expect } from "vitest";
import { classifyClick } from "@/lib/analytics/clicks";

const HOST = "www.pplsolutionsinc.com";

describe("classifyClick", () => {
  it("prefers an explicit data-track-click label", () => {
    expect(classifyClick({ trackAttr: "cta-contact", href: "/contact" }, HOST))
      .toEqual({ label: "cta-contact" });
  });

  it("classifies mailto and tel links", () => {
    expect(classifyClick({ href: "mailto:sales@pplsolutionsinc.com" }, HOST))
      .toEqual({ label: "email", meta: { href: "mailto:sales@pplsolutionsinc.com" } });
    expect(classifyClick({ href: "tel:+6321234567" }, HOST))
      .toEqual({ label: "phone", meta: { href: "tel:+6321234567" } });
  });

  it("classifies mailto and tel links regardless of scheme case or leading whitespace", () => {
    expect(classifyClick({ href: "MAILTO:sales@pplsolutionsinc.com" }, HOST))
      .toEqual({ label: "email", meta: { href: "MAILTO:sales@pplsolutionsinc.com" } });
    expect(classifyClick({ href: "TEL:+6321234567" }, HOST))
      .toEqual({ label: "phone", meta: { href: "TEL:+6321234567" } });
    expect(classifyClick({ href: " mailto:sales@pplsolutionsinc.com" }, HOST))
      .toEqual({ label: "email", meta: { href: " mailto:sales@pplsolutionsinc.com" } });
  });

  it("classifies external links as outbound", () => {
    expect(classifyClick({ href: "https://www.linkedin.com/in/x" }, HOST))
      .toEqual({ label: "outbound", meta: { href: "https://www.linkedin.com/in/x" } });
  });

  it("ignores internal links, absolute or relative, www or not", () => {
    expect(classifyClick({ href: "/about" }, HOST)).toBeNull();
    expect(classifyClick({ href: "https://www.pplsolutionsinc.com/about" }, HOST)).toBeNull();
    expect(classifyClick({ href: "https://pplsolutionsinc.com/about" }, HOST)).toBeNull();
  });

  it("ignores clicks on nothing trackable", () => {
    expect(classifyClick({}, HOST)).toBeNull();
    expect(classifyClick({ href: "" }, HOST)).toBeNull();
    expect(classifyClick({ trackAttr: "   ", href: "" }, HOST)).toBeNull();
  });

  it("ignores unparseable and non-http schemes", () => {
    expect(classifyClick({ href: "javascript:void(0)" }, HOST)).toBeNull();
    expect(classifyClick({ href: "#top" }, HOST)).toBeNull();
  });

  it("caps an overlong track label", () => {
    expect(classifyClick({ trackAttr: "a".repeat(200) }, HOST)?.label).toHaveLength(64);
  });
});
