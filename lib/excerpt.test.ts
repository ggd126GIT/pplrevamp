import { describe, expect, it } from "vitest";
import { excerptLines } from "./excerpt";

describe("excerptLines", () => {
  it("keeps a byline on its own line", () => {
    expect(
      excerptLines("By Tina Loneza\r\n\r\nLooking back, my journey into HR…"),
    ).toEqual(["By Tina Loneza", "Looking back, my journey into HR…"]);
  });

  it("handles CRLF, LF and lone CR alike", () => {
    expect(excerptLines("a\r\nb\nc\rd")).toEqual(["a", "b", "c", "d"]);
  });

  it("drops blank lines so a clamped card does not waste a row", () => {
    expect(excerptLines("one\n\n\n   \n\ntwo")).toEqual(["one", "two"]);
  });

  it("trims the leading and trailing space each line carries", () => {
    expect(excerptLines("  padded  \n\ttabbed\t")).toEqual([
      "padded",
      "tabbed",
    ]);
  });

  it("leaves a single-line excerpt as one line", () => {
    expect(excerptLines("If there's one thing I've learned…")).toEqual([
      "If there's one thing I've learned…",
    ]);
  });

  it("preserves runs of spaces inside a line", () => {
    expect(excerptLines("keep  the  spacing")).toEqual(["keep  the  spacing"]);
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(excerptLines("")).toEqual([]);
    expect(excerptLines("   \r\n  \n")).toEqual([]);
    expect(excerptLines(null)).toEqual([]);
  });
});
