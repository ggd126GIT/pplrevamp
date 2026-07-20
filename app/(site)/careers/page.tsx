import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Building2, Laptop, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join .ppl Solutions, Inc. — the playground of the best people. Explore our open roles.",
};

export const revalidate = 60;

const workModeLabels: Record<string, string> = {
  onsite: "On-site",
  wfh: "Work from home",
  hybrid: "Hybrid",
};

export default async function CareersPage() {
  const supabase = createPublicClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, slug, title, department, location, work_mode")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Join the playground of the best .ppl"
        intro="We open doors of opportunity through the right training and development. Explore our open roles below."
        image="/careers/ppl-careers-header.jpg"
      />

      <Section bg="white">
        <Container size="wide">
          {!jobs?.length ? (
            <div className="mx-auto max-w-md text-center">
              <p className="text-lg text-charcoal/70">
                We don&apos;t have any open roles right now — but we&apos;d still
                love to hear from driven, outstanding people.
              </p>
              <div className="mt-8 flex justify-center">
                <Button href="/contact" size="lg">
                  Get in Touch
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.slug}`}
                  className="group flex flex-col rounded-2xl border border-black/[0.06] bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10"
                >
                  <h2 className="text-xl font-bold text-ink">{job.title}</h2>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-charcoal/70">
                    {job.department && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-4 text-purple" />
                        {job.department}
                      </span>
                    )}
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4 text-purple" />
                        {job.location}
                      </span>
                    )}
                    {job.work_mode && (
                      <span className="inline-flex items-center gap-1.5">
                        <Laptop className="size-4 text-purple" />
                        {workModeLabels[job.work_mode] ?? job.work_mode}
                      </span>
                    )}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-purple">
                    View role &amp; apply
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
