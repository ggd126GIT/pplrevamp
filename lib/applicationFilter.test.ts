import { describe, it, expect } from "vitest";
import { parseStatusFilter, filterHref } from "@/lib/applicationFilter";

describe("parseStatusFilter", () => {
  it("accepts a real status", () => {
    expect(parseStatusFilter("rejected")).toBe("rejected");
  });

  it("treats anything unrecognised as no filter", () => {
    // A hand-edited query string must not 500 the page or silently show an
    // empty table that looks like "no applications".
    expect(parseStatusFilter("bogus")).toBeNull();
    expect(parseStatusFilter("")).toBeNull();
    expect(parseStatusFilter(undefined)).toBeNull();
    expect(parseStatusFilter("all")).toBeNull();
  });
});

describe("filterHref", () => {
  it("links to an unfiltered first page for 'all'", () => {
    expect(filterHref(null)).toBe("/admin/applications");
  });

  it("carries the status and drops the page number", () => {
    // Page 3 of everything is rarely page 3 of one status, and landing past
    // the end shows an empty table rather than results.
    expect(filterHref("hired")).toBe("/admin/applications?status=hired");
  });
});
