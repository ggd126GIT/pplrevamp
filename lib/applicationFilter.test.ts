import { describe, it, expect } from "vitest";
import {
  parseStatusFilter,
  filterHref,
  exportHref,
} from "@/lib/applicationFilter";

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

describe("exportHref", () => {
  it("points at the export route with no filter", () => {
    expect(exportHref(null)).toBe("/admin/applications/export");
  });

  it("carries the filter, so Export gives you what the tabs show", () => {
    expect(exportHref("rejected")).toBe(
      "/admin/applications/export?status=rejected",
    );
  });

  // The export must never inherit the page number: page 3 of the table is not
  // a meaningful slice of a file that contains every matching row.
  it("never carries a page number", () => {
    expect(exportHref("interview")).not.toContain("page");
  });
});
