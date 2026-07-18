"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Textarea, Select } from "@/components/forms/fields";
import { RichTextEditor } from "./RichTextEditor";
import { CoverImageUpload } from "./CoverImageUpload";
import type { PostFormState } from "@/app/admin/posts/actions";
import type { Json } from "@/lib/database.types";

type Values = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  status?: string;
  content?: Json | null;
};

export function PostForm({
  action,
  values = {},
  submitLabel = "Save post",
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  values?: Values;
  submitLabel?: string;
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

      <Field label="Excerpt" htmlFor="excerpt">
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={values.excerpt ?? ""}
          className="min-h-20"
          placeholder="Short summary shown on the blog listing."
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
