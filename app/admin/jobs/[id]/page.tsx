import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { JobForm } from "@/components/admin/JobForm";
import { createClient } from "@/lib/supabase/server";
import { docToText } from "@/lib/tiptap";
import { updateJob, deleteJob } from "../actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const boundUpdate = updateJob.bind(null, id);

  return (
    <div>
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-purple"
      >
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Edit job</h1>
        <form action={deleteJob}>
          <input type="hidden" name="id" value={job.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </form>
      </div>

      <div className="mt-8">
        <JobForm
          action={boundUpdate}
          submitLabel="Save changes"
          values={{
            title: job.title,
            slug: job.slug,
            department: job.department,
            location: job.location,
            work_mode: job.work_mode,
            status: job.status,
            description: docToText(job.description),
          }}
        />
      </div>
    </div>
  );
}
