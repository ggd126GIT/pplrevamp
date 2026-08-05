import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_SIZE,
  BLOG_PAGE_SIZE,
  pageCount,
  pageRange,
  parsePage,
  parsePageSegment,
} from "./pagination";

describe("parsePage", () => {
  it("reads a plain page number", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("takes the first value when the param repeats", () => {
    expect(parsePage(["2", "5"])).toBe(2);
  });

  // A query param the visitor did not type by hand should never 404 the view.
  it("falls back to page 1 for anything unparseable", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
  });

  it("floors a fractional page", () => {
    expect(parsePage("2.9")).toBe(2);
  });
});

describe("parsePageSegment", () => {
  it("reads a clean integer segment", () => {
    expect(parsePageSegment("1")).toBe(1);
    expect(parsePageSegment("2")).toBe(2);
    expect(parsePageSegment("10")).toBe(10);
  });

  // Unlike parsePage, a path segment that is not a page number is a URL that
  // does not exist — the caller must 404 rather than serve page 1.
  it("rejects anything that is not a clean integer", () => {
    expect(parsePageSegment("abc")).toBeNull();
    expect(parsePageSegment("1.5")).toBeNull();
    expect(parsePageSegment("-2")).toBeNull();
    expect(parsePageSegment("0")).toBeNull();
    expect(parsePageSegment("")).toBeNull();
    expect(parsePageSegment(" 2 ")).toBeNull();
  });

  // Distinct strings must not collapse onto one canonical page.
  it("rejects alternate spellings of a valid number", () => {
    expect(parsePageSegment("01")).toBeNull();
    expect(parsePageSegment("1e3")).toBeNull();
    expect(parsePageSegment("+2")).toBeNull();
  });
});

describe("pageRange", () => {
  it("defaults to the admin page size", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: ADMIN_PAGE_SIZE - 1 });
  });

  it("walks the blog page size nine at a time", () => {
    expect(pageRange(1, BLOG_PAGE_SIZE)).toEqual({ from: 0, to: 8 });
    expect(pageRange(2, BLOG_PAGE_SIZE)).toEqual({ from: 9, to: 17 });
    expect(pageRange(3, BLOG_PAGE_SIZE)).toEqual({ from: 18, to: 26 });
  });
});

describe("pageCount", () => {
  it("reports one page for an empty or unknown count", () => {
    expect(pageCount(0, BLOG_PAGE_SIZE)).toBe(1);
    expect(pageCount(null, BLOG_PAGE_SIZE)).toBe(1);
  });

  it("adds a page only once the current one is full", () => {
    expect(pageCount(9, BLOG_PAGE_SIZE)).toBe(1);
    expect(pageCount(10, BLOG_PAGE_SIZE)).toBe(2);
    expect(pageCount(18, BLOG_PAGE_SIZE)).toBe(2);
    expect(pageCount(19, BLOG_PAGE_SIZE)).toBe(3);
  });
});
