import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JobForm } from "@/components/admin/JobForm";
import { createJob } from "../actions";

export default function NewJobPage() {
  return (
    <div>
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-purple"
      >
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink">New job</h1>
      <div className="mt-8">
        <JobForm action={createJob} submitLabel="Create job" />
      </div>
    </div>
  );
}
