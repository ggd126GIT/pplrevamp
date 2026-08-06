/**
 * The rendered job page body, shared by the public route and the admin preview.
 *
 * Both MUST render through this component. The moment a preview draws itself
 * differently from production it stops answering the question it exists for, so
 * the only difference between the two callers is which rows they are allowed to
 * fetch — never how those rows are drawn.
 */
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Laptop,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { postedAt, employmentTypeLabels } from "@/lib/jobs";
import { formatManilaDate } from "@/lib/dates";
import { renderTiptap } from "@/lib/tiptap";
import { ShareLinks } from "@/components/ShareLinks";
import { absoluteUrl } from "@/lib/share";
import { jobPostingSchema, type JobForSchema } from "@/lib/jobSchema";
import type { Tables } from "@/lib/database.types";

const workModeLabels: Record<string, string> = {
  onsite: "On-site",
  wfh: "Work from home",
  hybrid: "Hybrid",
};

export function JobDetail({
  job,
  /** Structured data belongs only on the canonical public posting. */
  includeSchema = true,
}: {
  job: Tables<"jobs">;
  includeSchema?: boolean;
}) {
  const html = renderTiptap(job.description);
  const posted = postedAt(job);
  const meta = [
    job.department && { icon: Building2, label: job.department },
    job.location && { icon: MapPin, label: job.location },
    job.work_mode && {
      icon: Laptop,
      label: workModeLabels[job.work_mode] ?? job.work_mode,
    },
    job.employment_type && {
      icon: Briefcase,
      label: employmentTypeLabels[job.employment_type] ?? job.employment_type,
    },
  ].filter(Boolean) as { icon: typeof MapPin; label: string }[];

  return (
    <Section bg="white">
      {/* Google Jobs eligibility: the public page is the canonical posting, so
          the JobPosting markup lives there rather than on the /careers index —
          and never on a preview, which must not be indexable at all. */}
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              jobPostingSchema(job as JobForSchema, html),
            ),
          }}
        />
      )}
      <Container size="wide">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-purple hover:underline"
        >
          <ArrowLeft className="size-4" /> All roles
        </Link>

        <div className="mt-6 grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              {job.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-charcoal/70">
              {meta.map((m) => {
                const Icon = m.icon;
                return (
                  <span key={m.label} className="inline-flex items-center gap-1.5">
                    <Icon className="size-4 text-purple" />
                    {m.label}
                  </span>
                );
              })}
              {posted && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-purple" />
                  Posted&nbsp;
                  <time dateTime={posted}>{formatManilaDate(posted)}</time>
                </span>
              )}
            </div>

            {html ? (
              <div
                className="rich-content mt-8"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="mt-8 text-charcoal/70">
                We&apos;d love to tell you more — apply and our team will share
                the details.
              </p>
            )}

            <div className="mt-10 border-t border-black/[0.06] pt-6">
              <ShareLinks
                url={absoluteUrl(`/careers/${job.slug}`)}
                title={job.title}
              />
            </div>
          </div>

          {/* Application form */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-black/[0.06] bg-cream p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">Apply for this role</h2>
              <p className="mt-1 text-sm text-charcoal/60">
                Tell us about yourself and attach your CV.
              </p>
              <div className="mt-6">
                <ApplicationForm jobId={job.id} jobTitle={job.title} />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
