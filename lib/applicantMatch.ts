/**
 * Duplicate-applicant matching. Pure comparison with no database access, kept
 * out of the page so vitest (which runs `environment: "node"` and collects only
 * `**\/*.test.ts`) can cover the judgement calls.
 *
 * Two confidence levels, because one is a fact and the other is a guess. An
 * email match is the same account. A shared phone or a shared name is a lead for
 * a human to check — households share numbers and people share names, and
 * auto-rejecting on either would quietly lose real candidates.
 */

export type ApplicantRow = {
  id: string;
  first_name: string;
  last_name: string;
  /** Generated column: lower(trim(email)). */
  email_key: string | null;
  /** Generated column: last 10 digits of phone, '' when absent. */
  phone_key: string | null;
  created_at: string | null;
  status: string;
  /** Title of the role applied for, when known. */
  job_title?: string | null;
};

export type MatchReason = "email" | "phone" | "name";

export type ApplicantMatch = {
  row: ApplicantRow;
  reason: MatchReason;
};

export type MatchResult = {
  /** Same email address — the same person, as far as we can tell. */
  confirmed: ApplicantMatch[];
  /** Same phone or same name. A prompt to look, not a conclusion. */
  possible: ApplicantMatch[];
};

/**
 * A phone key is only trustworthy at full length. `right(digits, 10)` leaves a
 * malformed entry like "123" as a 3-character key, and matching on that would
 * pair unrelated people together.
 */
const PHONE_KEY_LENGTH = 10;

const nameKey = (r: ApplicantRow) =>
  `${r.first_name ?? ""}`.trim().toLowerCase() +
  " " +
  `${r.last_name ?? ""}`.trim().toLowerCase();

const usablePhone = (k: string | null | undefined) =>
  !!k && k.length === PHONE_KEY_LENGTH;

const usableEmail = (k: string | null | undefined) => !!k && k.length > 0;

/**
 * Find earlier applications that look like the same person.
 *
 * `others` may contain the target itself and unrelated rows; both are filtered
 * out here so callers can pass a broad query result without pre-filtering.
 * Results are newest first.
 */
export function matchApplicants(
  target: ApplicantRow,
  others: ApplicantRow[],
): MatchResult {
  const confirmed: ApplicantMatch[] = [];
  const possible: ApplicantMatch[] = [];
  const targetName = nameKey(target);

  for (const row of others) {
    if (row.id === target.id) continue;

    if (usableEmail(target.email_key) && row.email_key === target.email_key) {
      confirmed.push({ row, reason: "email" });
      continue; // An email match already settles it; don't double-report.
    }

    if (usablePhone(target.phone_key) && row.phone_key === target.phone_key) {
      possible.push({ row, reason: "phone" });
      continue;
    }

    if (targetName.trim() && nameKey(row) === targetName) {
      possible.push({ row, reason: "name" });
    }
  }

  const newestFirst = (a: ApplicantMatch, b: ApplicantMatch) =>
    Date.parse(b.row.created_at ?? "") - Date.parse(a.row.created_at ?? "");

  return {
    confirmed: confirmed.sort(newestFirst),
    possible: possible.sort(newestFirst),
  };
}

/**
 * How to describe a repeat application in one line.
 *
 * Counts only applications made BEFORE this one, so the ordinal describes this
 * application's place in the person's sequence. Counting every match regardless
 * of direction made the oldest row announce itself as the "2nd application",
 * which is the opposite of true.
 */
export function repeatLabel(
  result: MatchResult,
  createdAt: string | null,
): string | null {
  const self = Date.parse(createdAt ?? "");
  const prior = result.confirmed.filter((m) => {
    const t = Date.parse(m.row.created_at ?? "");
    return Number.isFinite(self) && Number.isFinite(t) ? t < self : false;
  }).length;
  if (prior === 0) return null;
  const ordinal = prior + 1;
  const suffix =
    ordinal % 100 >= 11 && ordinal % 100 <= 13
      ? "th"
      : ordinal % 10 === 1
        ? "st"
        : ordinal % 10 === 2
          ? "nd"
          : ordinal % 10 === 3
            ? "rd"
            : "th";
  return `${ordinal}${suffix} application — same email`;
}

/**
 * Whether any application by this person was rejected. Direction-agnostic on
 * purpose: a rejection is worth surfacing whichever row you are looking at.
 */
export function wasRejectedBefore(result: MatchResult): boolean {
  return result.confirmed.some((m) => m.row.status === "rejected");
}
