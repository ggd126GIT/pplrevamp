"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Honeypot } from "@/components/forms/fields";
import { HONEYPOT_FIELD } from "@/lib/forms";

const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const MAX_BYTES = 2 * 1024 * 1024;

type Status = "idle" | "submitting" | "success" | "error";

export function ApplicationForm({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("cv") as File | null;

    if (!file || file.size === 0) {
      setError("Please attach your CV.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Your CV must be under 2 MB.");
      return;
    }

    formData.set("jobId", jobId);
    setStatus("submitting");

    try {
      const res = await fetch("/api/apply", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-purple/20 bg-mist p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-purple" />
        <h3 className="mt-4 text-xl font-bold text-ink">Application sent!</h3>
        <p className="mt-2 text-charcoal/75">
          Thank you for applying for {jobTitle}. Our team will review your
          application and be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Honeypot name={HONEYPOT_FIELD} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" required>
          <TextInput id="first_name" name="first_name" autoComplete="given-name" required />
        </Field>
        <Field label="Last name" htmlFor="last_name" required>
          <TextInput id="last_name" name="last_name" autoComplete="family-name" required />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <TextInput id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone number" htmlFor="phone">
          <TextInput id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field label="CV / Resume" htmlFor="cv" required>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm text-charcoal/60 hover:border-purple hover:text-purple">
          <Upload className="size-5" />
          <span>{fileName ?? "Attach PDF, DOC, DOCX, JPG or PNG (max 2 MB)"}</span>
          <input
            id="cv"
            name="cv"
            type="file"
            accept={ACCEPT}
            required
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </Field>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
    </form>
  );
}
