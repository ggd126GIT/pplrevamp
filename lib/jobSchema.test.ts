import { describe, it, expect } from "vitest";
import { jobPostingSchema, type JobForSchema } from "@/lib/jobSchema";

const base: JobForSchema = {
  slug: "project-manager",
  title: "Project Manager",
  location: "Pasig",
  work_mode: "hybrid",
  created_at: "2026-07-31T15:49:03.269Z",
  expires_at: "2026-08-17T15:59:59.999Z",
  short_description: "Supports delivery of platform releases.",
};

describe("jobPostingSchema", () => {
  it("emits the fields Google requires", () => {
    const s = jobPostingSchema(base, "<p>Full description.</p>");
    expect(s["@type"]).toBe("JobPosting");
    expect(s.title).toBe("Project Manager");
    expect(s.description).toBe("<p>Full description.</p>");
    expect(s.datePosted).toBe("2026-07-31T15:49:03.269Z");
    expect(s.validThrough).toBe("2026-08-17T15:59:59.999Z");
    expect(s.hiringOrganization).toMatchObject({ "@type": "Organization" });
  });

  it("gives an on-site or hybrid role a physical location, not TELECOMMUTE", () => {
    const s = jobPostingSchema(base, "<p>x</p>");
    expect(s.jobLocationType).toBeUndefined();
    expect(s.jobLocation).toMatchObject({
      "@type": "Place",
      address: {
        addressLocality: "Pasig",
        addressRegion: "Metro Manila",
        addressCountry: "PH",
      },
    });
  });

  it("marks a fully remote role TELECOMMUTE with applicant location", () => {
    const s = jobPostingSchema({ ...base, work_mode: "wfh" }, "<p>x</p>");
    expect(s.jobLocationType).toBe("TELECOMMUTE");
    expect(s.applicantLocationRequirements).toMatchObject({ name: "Philippines" });
    // A remote role must not also claim a physical address.
    expect(s.jobLocation).toBeUndefined();
  });

  it("falls back to the short description when the body renders empty", () => {
    const s = jobPostingSchema(base, "   ");
    expect(s.description).toBe("Supports delivery of platform releases.");
  });

  it("still produces a description when body and blurb are both empty", () => {
    const s = jobPostingSchema(
      { ...base, short_description: null },
      "",
    );
    expect(String(s.description)).toContain("Project Manager");
  });

  it("omits validThrough and datePosted rather than emitting nulls", () => {
    const s = jobPostingSchema(
      { ...base, expires_at: null, created_at: null },
      "<p>x</p>",
    );
    expect("validThrough" in s).toBe(false);
    expect("datePosted" in s).toBe(false);
  });

  it("never invents a salary or employment type", () => {
    const s = jobPostingSchema(base, "<p>x</p>");
    expect("baseSalary" in s).toBe(false);
    expect("employmentType" in s).toBe(false);
  });

  it("falls back to the region when a job has no location", () => {
    const s = jobPostingSchema({ ...base, location: null }, "<p>x</p>");
    expect(s.jobLocation).toMatchObject({
      address: { addressLocality: "Metro Manila" },
    });
  });
});
