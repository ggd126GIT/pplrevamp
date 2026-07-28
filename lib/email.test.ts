import { describe, expect, it } from "vitest";
import { parseRecipients } from "./email";

describe("parseRecipients", () => {
  it("returns an empty list for missing or blank input", () => {
    expect(parseRecipients(undefined)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients("   ")).toEqual([]);
  });

  it("parses a single address", () => {
    expect(parseRecipients("sales@pplsolutionsinc.com")).toEqual([
      "sales@pplsolutionsinc.com",
    ]);
  });

  it("splits a comma-separated list and trims surrounding whitespace", () => {
    expect(parseRecipients("a@ppl.com, b@ppl.com ,c@ppl.com")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
      "c@ppl.com",
    ]);
  });

  it("also accepts semicolons, which is how Outlook copies a distro list", () => {
    expect(parseRecipients("a@ppl.com; b@ppl.com")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
    ]);
  });

  it("ignores empty segments from trailing or doubled separators", () => {
    expect(parseRecipients("a@ppl.com,,b@ppl.com,")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
    ]);
  });

  it("drops duplicates case-insensitively, keeping the first spelling", () => {
    expect(parseRecipients("Sales@ppl.com, sales@ppl.com")).toEqual([
      "Sales@ppl.com",
    ]);
  });

  // A typo in the env var must not cost us every notification: Resend rejects
  // the whole send if any recipient is malformed, so bad entries are dropped
  // and the valid ones still get through.
  it("drops malformed addresses but keeps the valid ones", () => {
    expect(parseRecipients("good@ppl.com, not-an-email, also@ppl.com")).toEqual([
      "good@ppl.com",
      "also@ppl.com",
    ]);
  });

  it("returns an empty list when every entry is malformed", () => {
    expect(parseRecipients("nope, still-nope")).toEqual([]);
  });
});
