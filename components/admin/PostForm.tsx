"use client";

import { useActionState, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Textarea, Select } from "@/components/forms/fields";
import { RichTextEditor } from "./RichTextEditor";
import { CoverImageUpload } from "./CoverImageUpload";
import type { PostFormState } from "@/app/admin/posts/actions";
import type { Json } from "@/lib/database.types";

type Values = {
  title?: string;
  slug?: string;
  byline?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
  status?: string;
  content?: Json | null;
  published_at?: string;
};

export function PostForm({
  action,
  values = {},
  submitLabel = "Save post",
  previewHref,
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  values?: Values;
  submitLabel?: string;
  /** Omitted on the new-post form: there is no saved row to preview yet. */
  previewHref?: string;
}) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    action,
    undefined,
  );
  const [content, setContent] = useState<Json>(
    values.content ?? { type: "doc", content: [{ type: "paragraph" }] },
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <Field label="Title" htmlFor="title" required>
        <TextInput id="title" name="title" defaultValue={values.title} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Slug" htmlFor="slug">
          <TextInput
            id="slug"
            name="slug"
            defaultValue={values.slug}
            placeholder="Auto from title"
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={values.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
      </div>

      <Field label="Published on" htmlFor="published_at">
        <TextInput
          id="published_at"
          name="published_at"
          type="datetime-local"
          defaultValue={values.published_at ?? ""}
        />
        <p className="mt-1.5 text-xs text-charcoal/60">
          Manila time. This is the date readers and search engines see — set it
          to backdate a post, or leave it blank to stamp the moment it goes live.
        </p>
      </Field>

      <Field label="Author" htmlFor="byline">
        <TextInput
          id="byline"
          name="byline"
          defaultValue={values.byline ?? ""}
          placeholder="Who wrote this post, e.g. Tina Loneza"
        />
      </Field>

      <Field label="Excerpt" htmlFor="excerpt">
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={values.excerpt ?? ""}
          className="min-h-20"
          placeholder="Short summary shown on the blog listing. The author goes in the field above."
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Cover image
        </span>
        <CoverImageUpload
          name="cover_image_url"
          defaultUrl={values.cover_image_url}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Content
        </span>
        <input type="hidden" name="content" value={JSON.stringify(content)} />
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      {state?.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      {/* Preview sits left of the submit button so the Save → Preview loop is one
          place, not a scroll back to the page header. It renders the SAVED row,
          not what is currently typed — hence the label. New tab so unsaved edits
          survive. */}
      <div className="flex flex-wrap items-center gap-3">
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-purple/30 px-4 py-2 text-sm font-medium text-purple hover:bg-purple/5"
          >
            <Eye className="size-4" /> Preview saved version
          </a>
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
      </div>
    </form>
  );
}
