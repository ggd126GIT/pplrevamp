import { describe, expect, it } from "vitest";
import { describeEmailRouting, parseRecipients } from "./email";

describe("parseRecipients", () => {
  it("returns an empty list for missing or blank input", () => {
    expect(parseRecipients(undefined)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients("   ")).toEqual([]);
  });

  it("parses a single address", () => {
    expect(parseRecipients("sales@pplsolutionsinc.com")).toEqual([
      "sales@pplsolutionsinc.com",
    ]);
  });

  it("splits a comma-separated list and trims surrounding whitespace", () => {
    expect(parseRecipients("a@ppl.com, b@ppl.com ,c@ppl.com")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
      "c@ppl.com",
    ]);
  });

  it("also accepts semicolons, which is how Outlook copies a distro list", () => {
    expect(parseRecipients("a@ppl.com; b@ppl.com")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
    ]);
  });

  it("ignores empty segments from trailing or doubled separators", () => {
    expect(parseRecipients("a@ppl.com,,b@ppl.com,")).toEqual([
      "a@ppl.com",
      "b@ppl.com",
    ]);
  });

  it("drops duplicates case-insensitively, keeping the first spelling", () => {
    expect(parseRecipients("Sales@ppl.com, sales@ppl.com")).toEqual([
      "Sales@ppl.com",
    ]);
  });

  // A typo in the env var must not cost us every notification: Resend rejects
  // the whole send if any recipient is malformed, so bad entries are dropped
  // and the valid ones still get through.
  it("drops malformed addresses but keeps the valid ones", () => {
    expect(parseRecipients("good@ppl.com, not-an-email, also@ppl.com")).toEqual([
      "good@ppl.com",
      "also@ppl.com",
    ]);
  });

  it("returns an empty list when every entry is malformed", () => {
    expect(parseRecipients("nope, still-nope")).toEqual([]);
  });
});

describe("describeEmailRouting", () => {
  const env = (
    over: Partial<NodeJS.ProcessEnv> = {},
  ): Partial<NodeJS.ProcessEnv> => ({ RESEND_API_KEY: "re_test", ...over });

  const rowFor = (r: ReturnType<typeof describeEmailRouting>, form: string) =>
    r.rows.find((row) => row.form === form)!;

  it("routes contact and discovery to CONTACT_NOTIFY_EMAIL", () => {
    const r = describeEmailRouting(
      env({ CONTACT_NOTIFY_EMAIL: "sales@ppl.com" }),
    );
    for (const form of ["Contact form", "Discovery form"]) {
      expect(rowFor(r, form).recipients).toEqual(["sales@ppl.com"]);
      expect(rowFor(r, form).source).toBe("CONTACT_NOTIFY_EMAIL");
    }
  });

  it("routes applications to JOBS_NOTIFY_EMAIL when it is set", () => {
    const jobs = rowFor(
      describeEmailRouting(
        env({
          CONTACT_NOTIFY_EMAIL: "sales@ppl.com",
          JOBS_NOTIFY_EMAIL: "careers@ppl.com",
        }),
      ),
      "Job applications",
    );
    expect(jobs.recipients).toEqual(["careers@ppl.com"]);
    expect(jobs.source).toBe("JOBS_NOTIFY_EMAIL");
    expect(jobs.fellBack).toBe(false);
  });

  it("reports the fallback when JOBS_NOTIFY_EMAIL is unset", () => {
    const jobs = rowFor(
      describeEmailRouting(env({ CONTACT_NOTIFY_EMAIL: "sales@ppl.com" })),
      "Job applications",
    );
    expect(jobs.recipients).toEqual(["sales@ppl.com"]);
    expect(jobs.source).toBe("CONTACT_NOTIFY_EMAIL");
    expect(jobs.fellBack).toBe(true);
  });

  // Matches sendInternalNotification: an override that yields no VALID address
  // falls through to the contact inbox, so the panel must say so too rather
  // than showing an address that never receives anything.
  it("treats an all-malformed jobs var as a fallback, not a destination", () => {
    const jobs = rowFor(
      describeEmailRouting(
        env({
          CONTACT_NOTIFY_EMAIL: "sales@ppl.com",
          JOBS_NOTIFY_EMAIL: "not-an-email",
        }),
      ),
      "Job applications",
    );
    expect(jobs.recipients).toEqual(["sales@ppl.com"]);
    expect(jobs.fellBack).toBe(true);
  });

  it("counts entries dropped as invalid or duplicate", () => {
    const row = rowFor(
      describeEmailRouting(
        env({ CONTACT_NOTIFY_EMAIL: "a@ppl.com, oops, a@ppl.com" }),
      ),
      "Contact form",
    );
    expect(row.recipients).toEqual(["a@ppl.com"]);
    expect(row.dropped).toBe(2);
  });

  it("reports empty recipients when nothing is configured", () => {
    const r = describeEmailRouting(env());
    expect(r.rows.every((row) => row.recipients.length === 0)).toBe(true);
  });

  it("flags the sandbox sender, which cannot reach those addresses", () => {
    expect(describeEmailRouting(env()).sandboxSender).toBe(true);
    expect(
      describeEmailRouting(env({ RESEND_FROM: ".ppl <hi@send.ppl.com>" }))
        .sandboxSender,
    ).toBe(false);
  });

  it("flags a missing API key, where nothing sends at all", () => {
    expect(describeEmailRouting({}).apiKeySet).toBe(false);
    expect(describeEmailRouting(env()).apiKeySet).toBe(true);
  });
});
