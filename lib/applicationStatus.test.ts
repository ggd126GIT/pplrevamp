import { describe, it, expect } from "vitest";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
} from "@/lib/applicationStatus";

describe("applicationStatus", () => {
  it("matches the database CHECK constraint exactly", () => {
    // applications_status_check. A value here that the constraint rejects fails
    // silently at save time — the action logs and returns, so the editor sees
    // the old value reappear with no error.
    expect([...APPLICATION_STATUSES]).toEqual([
      "new",
      "screening",
      "interview",
      "rejected",
      "hired",
      "withdrawn",
    ]);
  });

  it("accepts every status it declares", () => {
    for (const s of APPLICATION_STATUSES) {
      expect(isApplicationStatus(s)).toBe(true);
    }
  });

  it("rejects anything else, including inquiry statuses", () => {
    // The two vocabularies are different and a copy-paste between the two
    // admin pages is the likely mistake.
    expect(isApplicationStatus("qualified")).toBe(false);
    expect(isApplicationStatus("won")).toBe(false);
    expect(isApplicationStatus("")).toBe(false);
    expect(isApplicationStatus("NEW")).toBe(false);
    expect(isApplicationStatus(undefined)).toBe(false);
    expect(isApplicationStatus(null)).toBe(false);
  });
});
