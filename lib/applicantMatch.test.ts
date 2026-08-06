import { describe, expect, it } from "vitest";
import {
  matchApplicants,
  repeatLabel,
  wasRejectedBefore,
  type ApplicantRow,
} from "./applicantMatch";

const row = (o: Partial<ApplicantRow> & { id: string }): ApplicantRow => ({
  first_name: "Juan",
  last_name: "Cruz",
  email_key: "juan@example.com",
  phone_key: "9171234567",
  created_at: "2026-03-01T00:00:00.000Z",
  status: "new",
  ...o,
});

describe("matchApplicants", () => {
  it("treats a shared email as confirmed", () => {
    const r = matchApplicants(row({ id: "a" }), [row({ id: "b" })]);
    expect(r.confirmed).toHaveLength(1);
    expect(r.confirmed[0].reason).toBe("email");
    expect(r.possible).toHaveLength(0);
  });

  it("never matches a row against itself", () => {
    const me = row({ id: "a" });
    expect(matchApplicants(me, [me]).confirmed).toHaveLength(0);
  });

  it("treats a shared phone as only possible", () => {
    const r = matchApplicants(row({ id: "a" }), [
      row({ id: "b", email_key: "other@example.com" }),
    ]);
    expect(r.confirmed).toHaveLength(0);
    expect(r.possible[0].reason).toBe("phone");
  });

  it("treats a shared name as only possible", () => {
    const r = matchApplicants(row({ id: "a" }), [
      row({ id: "b", email_key: "other@example.com", phone_key: "9998887777" }),
    ]);
    expect(r.possible[0].reason).toBe("name");
  });

  // An email match is definitive; reporting the same person again under "possible"
  // would make one applicant look like two.
  it("does not also report an email match as a phone or name match", () => {
    const r = matchApplicants(row({ id: "a" }), [row({ id: "b" })]);
    expect(r.confirmed).toHaveLength(1);
    expect(r.possible).toHaveLength(0);
  });

  // right(digits,10) leaves "123" as a 3-char key; matching on that would pair
  // unrelated people who both typed a junk phone number.
  it("ignores a phone key shorter than ten digits", () => {
    const r = matchApplicants(
      row({ id: "a", phone_key: "123", email_key: "x@example.com", first_name: "A", last_name: "B" }),
      [row({ id: "b", phone_key: "123", email_key: "y@example.com", first_name: "C", last_name: "D" })],
    );
    expect(r.possible).toHaveLength(0);
  });

  it("ignores an empty phone key", () => {
    const r = matchApplicants(
      row({ id: "a", phone_key: "", email_key: "x@e.com", first_name: "A", last_name: "B" }),
      [row({ id: "b", phone_key: "", email_key: "y@e.com", first_name: "C", last_name: "D" })],
    );
    expect(r.possible).toHaveLength(0);
  });

  it("ignores an empty email key rather than matching all blanks together", () => {
    const r = matchApplicants(
      row({ id: "a", email_key: "", phone_key: "", first_name: "A", last_name: "B" }),
      [row({ id: "b", email_key: "", phone_key: "", first_name: "C", last_name: "D" })],
    );
    expect(r.confirmed).toHaveLength(0);
  });

  it("compares names case- and whitespace-insensitively", () => {
    const r = matchApplicants(
      row({ id: "a", email_key: "x@e.com", phone_key: "", first_name: " juan ", last_name: "CRUZ" }),
      [row({ id: "b", email_key: "y@e.com", phone_key: "", first_name: "Juan", last_name: "cruz" })],
    );
    expect(r.possible[0].reason).toBe("name");
  });

  it("returns matches newest first", () => {
    const r = matchApplicants(row({ id: "a" }), [
      row({ id: "old", created_at: "2026-01-01T00:00:00.000Z" }),
      row({ id: "new", created_at: "2026-06-01T00:00:00.000Z" }),
    ]);
    expect(r.confirmed.map((m) => m.row.id)).toEqual(["new", "old"]);
  });

  it("ignores unrelated rows", () => {
    const r = matchApplicants(row({ id: "a" }), [
      row({ id: "z", email_key: "z@e.com", phone_key: "1112223333", first_name: "Ana", last_name: "Reyes" }),
    ]);
    expect(r.confirmed).toHaveLength(0);
    expect(r.possible).toHaveLength(0);
  });
});

describe("repeatLabel", () => {
  it("counts the current application too", () => {
    const one = matchApplicants(row({ id: "a" }), [row({ id: "b" })]);
    expect(repeatLabel(one)).toBe("2nd application — same email");

    const two = matchApplicants(row({ id: "a" }), [row({ id: "b" }), row({ id: "c" })]);
    expect(repeatLabel(two)).toBe("3rd application — same email");
  });

  it("says nothing when there is no confirmed repeat", () => {
    expect(repeatLabel({ confirmed: [], possible: [] })).toBeNull();
  });

  it("handles the teens, where the naive ordinal rule breaks", () => {
    const many = { confirmed: Array.from({ length: 12 }, (_, i) => ({ row: row({ id: String(i) }), reason: "email" as const })), possible: [] };
    expect(repeatLabel(many)).toBe("13th application — same email");
  });
});

describe("wasRejectedBefore", () => {
  it("is true when a prior application by the same email was rejected", () => {
    const r = matchApplicants(row({ id: "a" }), [row({ id: "b", status: "rejected" })]);
    expect(wasRejectedBefore(r)).toBe(true);
  });

  // A rejection under a merely POSSIBLE match is not this person's history.
  it("ignores rejections on possible-only matches", () => {
    const r = matchApplicants(row({ id: "a" }), [
      row({ id: "b", email_key: "other@e.com", status: "rejected" }),
    ]);
    expect(wasRejectedBefore(r)).toBe(false);
  });
});
