import { describe, it, expect } from "vitest";
import {
  NO_FILTERS,
  filterHref,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  parseStatusFilter,
  type ApplicationFilters,
} from "@/lib/applicationFilter";

const JOB = "74c7641f-ddea-40ba-984d-4bc4038bbb02";

const filters = (over: Partial<ApplicationFilters> = {}): ApplicationFilters => ({
  ...NO_FILTERS,
  ...over,
});

describe("parseStatusFilter", () => {
  it("accepts a real status", () => {
    expect(parseStatusFilter("rejected")).toBe("rejected");
  });

  it.each([undefined, "", "bogus", "REJECTED"])(
    "treats %o as no filter",
    (value) => {
      expect(parseStatusFilter(value)).toBeNull();
    },
  );
});

describe("parseFilters", () => {
  it("reads every facet", () => {
    expect(
      parseFilters({
        status: "hired",
        job: JOB,
        from: "2026-01-01",
        to: "2026-06-30",
      }),
    ).toEqual({
      status: "hired",
      jobId: JOB,
      from: "2026-01-01",
      to: "2026-06-30",
    });
  });

  it("returns no filters for an empty query string", () => {
    expect(parseFilters({})).toEqual(NO_FILTERS);
  });

  // Every one of these must degrade to "no filter", never to an empty table:
  // an empty result nobody can explain is worse than an ignored parameter.
  it.each(["2026-13-01", "01-01-2026", "2026-1-1", "yesterday", "", "  "])(
    "drops the malformed date %o",
    (value) => {
      expect(parseFilters({ from: value }).from).toBeNull();
    },
  );

  it.each(["not-a-uuid", "123", "'; drop table applications;--"])(
    "drops the malformed job id %o",
    (value) => {
      expect(parseFilters({ job: value }).jobId).toBeNull();
    },
  );

  it("swaps a backwards range rather than returning nothing", () => {
    const f = parseFilters({ from: "2026-06-30", to: "2026-01-01" });
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-06-30");
  });

  it("leaves a correctly ordered range alone", () => {
    const f = parseFilters({ from: "2026-01-01", to: "2026-06-30" });
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-06-30");
  });

  it("does not swap when only one end is set", () => {
    expect(parseFilters({ from: "2026-06-30" }).to).toBeNull();
    expect(parseFilters({ to: "2026-01-01" }).from).toBeNull();
  });
});

describe("hasActiveFilters", () => {
  it("is false for no filters", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it.each([
    ["status", filters({ status: "hired" })],
    ["job", filters({ jobId: JOB })],
    ["from", filters({ from: "2026-01-01" })],
    ["to", filters({ to: "2026-01-01" })],
  ])("is true when %s is set", (_label, f) => {
    expect(hasActiveFilters(f)).toBe(true);
  });
});

describe("filtersToQuery", () => {
  it("is empty when nothing is set", () => {
    expect(filtersToQuery(NO_FILTERS)).toBe("");
  });

  it("omits unset facets rather than sending blanks", () => {
    expect(filtersToQuery(filters({ status: "hired" }))).toBe("status=hired");
  });

  // The whole point of overrides: switching status must not wipe the date range
  // the reader just typed in.
  it("applies an override without discarding the other facets", () => {
    const f = filters({ status: "new", from: "2026-01-01", jobId: JOB });
    const query = filtersToQuery(f, { status: "rejected" });
    expect(query).toContain("status=rejected");
    expect(query).toContain("from=2026-01-01");
    expect(query).toContain(`job=${JOB}`);
  });

  it("clears a facet when overridden with null", () => {
    const f = filters({ status: "new", from: "2026-01-01" });
    expect(filtersToQuery(f, { status: null })).toBe("from=2026-01-01");
  });
});

describe("filterHref", () => {
  it("is the bare path when nothing is filtered", () => {
    expect(filterHref(NO_FILTERS)).toBe("/admin/applications");
  });

  it("carries the filters", () => {
    expect(filterHref(filters({ status: "rejected" }))).toBe(
      "/admin/applications?status=rejected",
    );
  });

  it("never carries a page number", () => {
    expect(filterHref(filters({ status: "interview", from: "2026-01-01" })))
      .not.toContain("page");
  });
});

// There is no exportHref to test: the Export button submits the filter form
// itself via formAction, so the table and the file cannot disagree about what
// is selected — they read the same fields. See ApplicationFilters.

// The regex alone accepts these; only a real-date check rejects them. A filter
// that displays a value it is not applying is worse than one that ignores it.
describe("parseFilters rejects dates that pass the shape check", () => {
  it.each(["2026-13-01", "2026-00-10", "2026-02-30", "2026-04-31"])(
    "drops %o",
    (value) => {
      expect(parseFilters({ from: value }).from).toBeNull();
      expect(parseFilters({ to: value }).to).toBeNull();
    },
  );

  it("keeps a leap day that really exists", () => {
    expect(parseFilters({ from: "2028-02-29" }).from).toBe("2028-02-29");
  });
});
