import { describe, it, expect } from "vitest";
import { applyApplicationFilters } from "./applicationQuery";
import { NO_FILTERS, type ApplicationFilters } from "./applicationFilter";

type Call = [method: string, column: string, value: string];

/** Records what would have been sent to Postgrest, without a database. */
function fakeQuery() {
  const calls: Call[] = [];
  const q = {
    calls,
    eq(column: string, value: string) {
      calls.push(["eq", column, value]);
      return q;
    },
    gte(column: string, value: string) {
      calls.push(["gte", column, value]);
      return q;
    },
    lte(column: string, value: string) {
      calls.push(["lte", column, value]);
      return q;
    },
  };
  return q;
}

const filters = (over: Partial<ApplicationFilters> = {}): ApplicationFilters => ({
  ...NO_FILTERS,
  ...over,
});

const JOB = "74c7641f-ddea-40ba-984d-4bc4038bbb02";

describe("applyApplicationFilters", () => {
  it("adds no predicates when nothing is filtered", () => {
    expect(applyApplicationFilters(fakeQuery(), NO_FILTERS).calls).toEqual([]);
  });

  it("filters by status", () => {
    expect(
      applyApplicationFilters(fakeQuery(), filters({ status: "hired" })).calls,
    ).toEqual([["eq", "status", "hired"]]);
  });

  it("filters by job id", () => {
    expect(
      applyApplicationFilters(fakeQuery(), filters({ jobId: JOB })).calls,
    ).toEqual([["eq", "job_id", JOB]]);
  });

  it("bounds the range at the start and end of the Manila days named", () => {
    const calls = applyApplicationFilters(
      fakeQuery(),
      filters({ from: "2026-08-07", to: "2026-08-07" }),
    ).calls;

    expect(calls).toEqual([
      ["gte", "created_at", "2026-08-06T16:00:00.000Z"],
      ["lte", "created_at", "2026-08-07T15:59:59.999Z"],
    ]);
  });

  // The bug this prevents: an application submitted at 00:30 Manila is stored
  // as 16:30 the previous UTC day. A naive bound on the date string alone
  // would omit it from a single-day export and nobody would know.
  it("includes an application made just after midnight Manila", () => {
    const [[, , start]] = applyApplicationFilters(
      fakeQuery(),
      filters({ from: "2026-08-07" }),
    ).calls;
    const justAfterMidnightManila = Date.parse("2026-08-06T16:30:00Z");
    expect(justAfterMidnightManila).toBeGreaterThanOrEqual(Date.parse(start));
  });

  it("includes an application made just before midnight Manila", () => {
    const [[, , end]] = applyApplicationFilters(
      fakeQuery(),
      filters({ to: "2026-08-07" }),
    ).calls;
    const justBeforeMidnightManila = Date.parse("2026-08-07T15:30:00Z");
    expect(justBeforeMidnightManila).toBeLessThanOrEqual(Date.parse(end));
  });

  it("accepts an open-ended range at either end", () => {
    expect(
      applyApplicationFilters(fakeQuery(), filters({ from: "2026-08-07" })).calls,
    ).toHaveLength(1);
    expect(
      applyApplicationFilters(fakeQuery(), filters({ to: "2026-08-07" })).calls,
    ).toHaveLength(1);
  });

  it("combines every facet", () => {
    const calls = applyApplicationFilters(
      fakeQuery(),
      filters({ status: "new", jobId: JOB, from: "2026-01-01", to: "2026-06-30" }),
    ).calls;
    expect(calls.map((c) => `${c[0]}:${c[1]}`)).toEqual([
      "eq:status",
      "eq:job_id",
      "gte:created_at",
      "lte:created_at",
    ]);
  });

  // parseFilters should never hand this through, but a bad date must not reach
  // the database as the literal string "undefined".
  it("skips a malformed date rather than passing it on", () => {
    expect(
      applyApplicationFilters(fakeQuery(), filters({ from: "2026-13-45" })).calls,
    ).toEqual([]);
  });
});
