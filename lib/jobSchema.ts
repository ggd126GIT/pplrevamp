/**
 * JobPosting structured data. Pure object building with no DOM access, kept out
 * of the component so vitest (which runs `environment: "node"` and only collects
 * `**\/*.test.ts`) can cover the conditional branches.
 *
 * Eligibility for Google Jobs depends on getting the required fields right:
 * `title`, `description`, `datePosted`, `hiringOrganization` and a location.
 * Fields we do not actually hold — salary and employment type — are deliberately
 * omitted rather than guessed: a wrong `baseSalary` in structured data is a
 * claim made on the client's behalf to every jobseeker who sees the listing.
 */
import { site } from "@/lib/site";

export type JobForSchema = {
  slug: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  created_at: string | null;
  expires_at: string | null;
  short_description: string | null;
};

/** Google wants the country of the office, not of the applicant's browser. */
const COUNTRY = "PH";
const REGION = "Metro Manila";

export function jobPostingSchema(
  job: JobForSchema,
  descriptionHtml: string,
): Record<string, unknown> {
  // `description` is required and must be a real description, not a title echo.
  // Tiptap can render empty for a job saved with no body, so fall back to the
  // card blurb before giving up.
  const description =
    descriptionHtml.trim() ||
    job.short_description?.trim() ||
    `${job.title} at ${site.name}.`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    identifier: {
      "@type": "PropertyValue",
      name: site.name,
      value: job.slug,
    },
    hiringOrganization: {
      "@type": "Organization",
      name: site.name,
      sameAs: site.url,
      logo: `${site.url}/ppl-logo.png`,
    },
    // The application form lives on this page, so the applicant never leaves.
    directApply: true,
  };

  // datePosted is required. It is only absent on rows predating the column
  // default, and emitting an invalid date is worse than omitting the field.
  if (job.created_at) schema.datePosted = job.created_at;

  // Expiry is optional in our schema but Google drops postings that outlive
  // their validThrough, which is exactly the behaviour we want for expired roles.
  if (job.expires_at) schema.validThrough = job.expires_at;

  if (job.work_mode === "wfh") {
    // TELECOMMUTE is only correct for fully remote. Hybrid roles still require
    // attendance, so they keep a physical jobLocation below.
    schema.jobLocationType = "TELECOMMUTE";
    schema.applicantLocationRequirements = {
      "@type": "Country",
      name: "Philippines",
    };
  } else {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        // `location` is free text an editor typed, so it is used as the locality
        // rather than parsed. No street address: a role need not sit at the
        // registered office, and inventing one would be a false claim.
        addressLocality: job.location ?? REGION,
        addressRegion: REGION,
        addressCountry: COUNTRY,
      },
    };
  }

  return schema;
}
