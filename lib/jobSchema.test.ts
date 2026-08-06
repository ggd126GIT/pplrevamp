import { describe, it, expect } from "vitest";
import { jobPostingSchema, type JobForSchema } from "@/lib/jobSchema";
import { site } from "@/lib/site";

const base: JobForSchema = {
  slug: "project-manager",
  title: "Project Manager",
  location: "Pasig",
  work_mode: "hybrid",
  created_at: "2026-07-31T15:49:03.269Z",
  posted_at: null,
  expires_at: "2026-08-17T15:59:59.999Z",
  employment_type: "FULL_TIME",
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
        streetAddress: `${site.address.street}, ${site.address.district}`,
        addressLocality: "Pasig",
        addressRegion: "Metro Manila",
        postalCode: "1605",
        addressCountry: "PH",
      },
    });
  });

  it("marks a fully remote role TELECOMMUTE with applicant location", () => {
    const s = jobPostingSchema({ ...base, work_mode: "wfh" }, "<p>x</p>");
    expect(s.jobLocationType).toBe("TELECOMMUTE");
    expect(s.applicantLocationRequirements).toMatchObject({ name: "Philippines" });
    // A remote role must not also claim a physical address — least of all the
    // office street, which is exactly where nobody works.
    expect(s.jobLocation).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain(site.address.street);
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

  it("never invents a salary", () => {
    const s = jobPostingSchema(base, "<p>x</p>");
    expect("baseSalary" in s).toBe(false);
  });

  it("emits the employment type when a job carries one", () => {
    const s = jobPostingSchema(base, "<p>x</p>");
    expect(s.employmentType).toBe("FULL_TIME");
  });

  it("omits the employment type rather than guessing one", () => {
    const s = jobPostingSchema(
      { ...base, employment_type: null },
      "<p>x</p>",
    );
    expect("employmentType" in s).toBe(false);
  });

  it("prefers the editor's posted date over the row's creation time", () => {
    const s = jobPostingSchema(
      { ...base, posted_at: "2026-08-01T02:00:00.000Z" },
      "<p>x</p>",
    );
    expect(s.datePosted).toBe("2026-08-01T02:00:00.000Z");
  });

  it("falls back to the region when a job has no location", () => {
    const s = jobPostingSchema({ ...base, location: null }, "<p>x</p>");
    expect(s.jobLocation).toMatchObject({
      address: { addressLocality: "Metro Manila" },
    });
  });
});
