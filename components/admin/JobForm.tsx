"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  TextInput,
  Textarea,
  Select,
} from "@/components/forms/fields";
import { RichTextEditor } from "./RichTextEditor";
import type { JobFormState } from "@/app/admin/jobs/actions";
import type { Json } from "@/lib/database.types";

type Values = {
  title?: string;
  slug?: string;
  department?: string | null;
  location?: string | null;
  work_mode?: string | null;
  status?: string;
  short_description?: string | null;
  description?: Json | null;
  expires_at?: string;
};

export function JobForm({
  action,
  values = {},
  submitLabel = "Save job",
}: {
  action: (state: JobFormState, formData: FormData) => Promise<JobFormState>;
  values?: Values;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<JobFormState, FormData>(
    action,
    undefined,
  );
  const [description, setDescription] = useState<Json>(
    values.description ?? { type: "doc", content: [{ type: "paragraph" }] },
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <Field label="Title" htmlFor="title" required>
        <TextInput id="title" name="title" defaultValue={values.title} required />
      </Field>

      <Field label="Slug" htmlFor="slug">
        <TextInput
          id="slug"
          name="slug"
          defaultValue={values.slug}
          placeholder="Auto-generated from title if left blank"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Department" htmlFor="department">
          <TextInput
            id="department"
            name="department"
            defaultValue={values.department ?? ""}
          />
        </Field>
        <Field label="Location" htmlFor="location">
          <TextInput
            id="location"
            name="location"
            defaultValue={values.location ?? ""}
          />
        </Field>
        <Field label="Work mode" htmlFor="work_mode">
          <Select
            id="work_mode"
            name="work_mode"
            defaultValue={values.work_mode ?? ""}
          >
            <option value="">Not specified</option>
            <option value="onsite">On-site</option>
            <option value="wfh">Work from home</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={values.status ?? "open"}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Expires on" htmlFor="expires_at">
          <TextInput
            id="expires_at"
            name="expires_at"
            type="date"
            defaultValue={values.expires_at ?? ""}
          />
          <p className="mt-1.5 text-xs text-charcoal/60">
            Leave blank for no expiry. The role hides from /careers at the end of
            this day, Manila time.
          </p>
        </Field>
      </div>

      <Field label="Short description" htmlFor="short_description">
        <Textarea
          id="short_description"
          name="short_description"
          defaultValue={values.short_description ?? ""}
          className="min-h-20"
          placeholder="One or two sentences shown on the careers listing card."
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Description
        </span>
        <input
          type="hidden"
          name="description"
          value={JSON.stringify(description)}
        />
        <RichTextEditor value={description} onChange={setDescription} />
      </div>

      {state?.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
