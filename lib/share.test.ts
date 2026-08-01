import { describe, expect, it } from "vitest";
import { absoluteUrl, previewDescription, shareLinks } from "./share";

describe("previewDescription", () => {
  it("leaves text that already fits untouched", () => {
    expect(previewDescription("Short and sweet.")).toBe("Short and sweet.");
  });

  it("collapses newlines and runs of whitespace", () => {
    expect(previewDescription("Pasted\n\nfrom   Word\ttoo")).toBe(
      "Pasted from Word too",
    );
  });

  it("clamps to a whole word, never mid-word", () => {
    const text = `${"alpha ".repeat(60)}omega`;
    const out = previewDescription(text);
    expect(out.length).toBeLessThanOrEqual(201); // 200 + the ellipsis
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/alph…$/);
  });

  it("does not leave dangling punctuation before the ellipsis", () => {
    const text = `${"word ".repeat(38)}end. more text follows here`;
    expect(previewDescription(text)).not.toMatch(/[.,;:]…$/);
  });

  // A single unbroken token has no word boundary to fall back to.
  it("still clamps text with no spaces", () => {
    const out = previewDescription("x".repeat(400));
    expect(out).toBe(`${"x".repeat(200)}…`);
  });
});

describe("absoluteUrl", () => {
  it("joins a root-relative path onto the site origin", () => {
    expect(absoluteUrl("/blog/hello")).toBe(
      "https://www.pplsolutionsinc.com/blog/hello",
    );
  });

  it("does not double the slash", () => {
    expect(absoluteUrl("/careers/project-manager")).not.toContain("//careers");
  });
});

describe("shareLinks", () => {
  const url = "https://www.pplsolutionsinc.com/blog/hello";

  it("builds a LinkedIn share URL with the target encoded", () => {
    expect(shareLinks(url, "Hello").linkedin).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.pplsolutionsinc.com%2Fblog%2Fhello",
    );
  });

  it("builds a Facebook sharer URL", () => {
    expect(shareLinks(url, "Hello").facebook).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.pplsolutionsinc.com%2Fblog%2Fhello",
    );
  });

  it("carries the title into the X intent", () => {
    expect(shareLinks(url, "Hello").x).toContain("&text=Hello");
  });

  // The real copy is full of these; an unencoded & or # truncates the share.
  it("encodes ampersands, hashes and question marks in the title", () => {
    const { x } = shareLinks(url, "Q&A: why #BPO? ");
    expect(x).toContain("Q%26A%3A%20why%20%23BPO%3F");
    expect(x).not.toContain("&text=Q&A");
  });

  it("encodes the em dashes the site's headings use", () => {
    expect(shareLinks(url, "Offshoring — explained").x).toContain(
      "Offshoring%20%E2%80%94%20explained",
    );
  });
});
