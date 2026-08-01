import { describe, expect, it } from "vitest";
import { absoluteUrl, shareLinks } from "./share";

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
