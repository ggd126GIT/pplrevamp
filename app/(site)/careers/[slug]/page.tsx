import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { createPublicClient } from "@/lib/supabase/public";
import {
  notExpiredFilter,
  postedAt,
  employmentTypeLabels,
} from "@/lib/jobs";
import { formatManilaDate } from "@/lib/dates";
import { renderTiptap } from "@/lib/tiptap";
import { ShareLinks } from "@/components/ShareLinks";
import { absoluteUrl, previewDescription } from "@/lib/share";
import { jobPostingSchema } from "@/lib/jobSchema";
import { site } from "@/lib/site";

export const revalidate = 60;

const workModeLabels: Record<string, string> = {
  onsite: "On-site",
  wfh: "Work from home",
  hybrid: "Hybrid",
};

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("jobs")
    .select("slug")
    .eq("status", "open")
    .or(notExpiredFilter());
  return (data ?? []).map((j) => ({ slug: j.slug }));
}

async function getJob(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "open")
    .or(notExpiredFilter())
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return { title: "Role not found" };
  const url = absoluteUrl(`/careers/${slug}`);
  // short_description is a pasted paragraph with no length cap, and an
  // over-long card description gets truncated or dropped by the crawlers.
  const description = previewDescription(
    job.short_description ?? `Apply for ${job.title} at ${site.name}.`,
  );

  return {
    title: `${job.title} — Careers`,
    description,
    alternates: { canonical: url },
    // No images key here — see the note in blog/[slug]/page.tsx. Its ABSENCE
    // is what lets the generated opengraph-image route merge in; images:
    // undefined would suppress it.
    openGraph: {
      title: job.title,
      description,
      type: "article",
      url,
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: job.title,
      description,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

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
      {/* Google Jobs eligibility: this page is the canonical posting, so the
          JobPosting markup lives here rather than on the /careers index. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jobPostingSchema(job, html)),
        }}
      />
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
