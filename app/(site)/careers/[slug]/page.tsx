import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetail } from "@/components/careers/JobDetail";
import { createPublicClient } from "@/lib/supabase/public";
import { notExpiredFilter } from "@/lib/jobs";
import { absoluteUrl, previewDescription } from "@/lib/share";
import { site } from "@/lib/site";

export const revalidate = 60;

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

  return <JobDetail job={job} />;
}
