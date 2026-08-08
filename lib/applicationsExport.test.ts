import { describe, it, expect } from "vitest";
import {
  EXPORT_HEADERS,
  csvCell,
  exportFilename,
  neutralizeFormula,
  toCsv,
  type ExportRow,
} from "./applicationsExport";

const row = (over: Partial<ExportRow> = {}): ExportRow => ({
  first_name: "Ana",
  last_name: "Cruz",
  email: "ana@example.com",
  phone: "+639171234567",
  job_title: "Tier 1 Support Agent",
  created_at: "2026-08-07T02:00:00Z",
  status: "new",
  cv_link: "https://example.com/cv.pdf",
  ...over,
});

describe("neutralizeFormula", () => {
  it.each(["=1+1", "@SUM(A1)", "\tcmd", "\rcmd"])(
    "prefixes %o, which Excel would execute",
    (value) => {
      expect(neutralizeFormula(value)).toBe(`'${value}`);
    },
  );

  // The reason the rule is not a blanket "+ and - are dangerous": every
  // international phone number in this file starts with +.
  it.each(["+639171234567", "+1.814.747.5335", "-42", "-1.5"])(
    "leaves %o alone",
    (value) => {
      expect(neutralizeFormula(value)).toBe(value);
    },
  );

  it.each(["+cmd|' /C calc'!A0", "-HYPERLINK(1)", "+AND(1)"])(
    "still guards %o, where the sign is not a number",
    (value) => {
      expect(neutralizeFormula(value)).toBe(`'${value}`);
    },
  );

  it("leaves ordinary text and empty values untouched", () => {
    expect(neutralizeFormula("Ana Cruz")).toBe("Ana Cruz");
    expect(neutralizeFormula("")).toBe("");
  });
});

describe("csvCell", () => {
  it("leaves a plain value unquoted", () => {
    expect(csvCell("Ana")).toBe("Ana");
  });

  it("renders null and undefined as empty, not as the word null", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it.each([
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line1\nline2", '"line1\nline2"'],
    ["line1\r\nline2", '"line1\r\nline2"'],
    [" padded ", '" padded "'],
  ])("quotes %o so the row cannot break", (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  // A name containing a comma is the everyday case that corrupts a naive export.
  it("keeps a comma inside one field rather than splitting the row", () => {
    const csv = toCsv([row({ last_name: "Cruz, Jr." })]);
    expect(csv).toContain('"Cruz, Jr."');
    expect(csv.trimEnd().split("\r\n")).toHaveLength(2);
  });
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM so Excel does not mangle non-ASCII names", () => {
    expect(toCsv([])).toMatch(/^﻿/);
  });

  it("writes the header even when there are no rows", () => {
    expect(toCsv([])).toBe(`﻿${EXPORT_HEADERS.join(",")}\r\n`);
  });

  it("preserves a non-ASCII name intact", () => {
    expect(toCsv([row({ last_name: "Peña" })])).toContain("Peña");
  });

  it("writes one line per row, CRLF terminated", () => {
    const csv = toCsv([row(), row({ first_name: "Ben" })]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    // The BOM rides on the first line; strip it before comparing the header.
    expect(lines[0].replace(/^﻿/, "")).toBe(EXPORT_HEADERS.join(","));
  });

  it("renders the applied date as yyyy-mm-dd in Manila time", () => {
    // 02:00 UTC is 10:00 the SAME day in Manila.
    expect(toCsv([row({ created_at: "2026-08-07T02:00:00Z" })])).toContain(
      "2026-08-07",
    );
    // 20:00 UTC is 04:00 the NEXT day in Manila — the off-by-one this guards.
    expect(toCsv([row({ created_at: "2026-08-07T20:00:00Z" })])).toContain(
      "2026-08-08",
    );
  });

  it("leaves the CV column empty when there is no link", () => {
    const line = toCsv([row({ cv_link: null })]).trimEnd().split("\r\n")[1];
    expect(line.endsWith(",")).toBe(true);
  });

  it("keeps every column in header order", () => {
    const line = toCsv([row()]).trimEnd().split("\r\n")[1];
    expect(line.split(",")).toHaveLength(EXPORT_HEADERS.length);
  });
});

describe("exportFilename", () => {
  const now = new Date("2026-08-08T01:00:00Z");

  it("names an unfiltered export by date", () => {
    expect(exportFilename(null, now)).toBe("applications-2026-08-08.csv");
  });

  it("carries the filter, so two exports the same day do not collide", () => {
    expect(exportFilename("rejected", now)).toBe(
      "applications-rejected-2026-08-08.csv",
    );
    expect(exportFilename("rejected", now)).not.toBe(exportFilename(null, now));
  });
});
