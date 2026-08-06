/**
 * JobPosting structured data. Pure object building with no DOM access, kept out
 * of the component so vitest (which runs `environment: "node"` and only collects
 * `**\/*.test.ts`) can cover the conditional branches.
 *
 * Eligibility for Google Jobs depends on getting the required fields right:
 * `title`, `description`, `datePosted`, `hiringOrganization` and a location.
 * `baseSalary` is deliberately omitted rather than guessed: a wrong salary in
 * structured data is a claim made on the client's behalf to every jobseeker who
 * sees the listing. Search Console reports its absence as non-critical.
 */
import { site } from "@/lib/site";

export type JobForSchema = {
  slug: string;
  title: string;
  location: string | null;
  work_mode: string | null;
  created_at: string | null;
  posted_at: string | null;
  expires_at: string | null;
  employment_type: string | null;
  short_description: string | null;
};

/** Google wants the country of the office, not of the applicant's browser. */
const REGION = site.address.region;

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

  // datePosted is required. The editor's posted date wins over the row's
  // creation time; absent both, omitting the field beats emitting an invalid
  // date.
  const datePosted = job.posted_at ?? job.created_at;
  if (datePosted) schema.datePosted = datePosted;

  // Left null when an editor has not said which it is. Values are stored in
  // schema.org's own vocabulary, so they pass straight through.
  if (job.employment_type) schema.employmentType = job.employment_type;

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
    // On-site and hybrid roles are staffed from the registered office, so they
    // carry its street and postcode. A role staffed anywhere else would need a
    // per-job address rather than this constant.
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: `${site.address.street}, ${site.address.district}`,
        // `location` is free text an editor typed, so it is used as the locality
        // rather than parsed.
        addressLocality: job.location ?? REGION,
        addressRegion: REGION,
        postalCode: site.address.postalCode,
        addressCountry: site.address.country,
      },
    };
  }

  return schema;
}
