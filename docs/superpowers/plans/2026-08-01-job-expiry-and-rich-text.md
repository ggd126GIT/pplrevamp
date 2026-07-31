# Job Expiry and Rich-Text Job Descriptions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give jobs a nullable expiry date that hides them from the public site once it passes, and replace the job description textarea with the existing Tiptap editor plus an Underline button.

**Architecture:** Expiry is *derived* — a nullable `jobs.expires_at` column plus a predicate applied at every read. Nothing ever writes back to `status`, so no scheduled job is needed and extending a date instantly un-hides the role. The predicate lives in two shared helpers (`lib/dates.ts`, `lib/jobs.ts`) so the admin form, the three public queries, and the apply route cannot drift, and it is *also* encoded in the public RLS policy so the anon key cannot read an expired job even if a query forgets the filter. Rich text reuses `components/admin/RichTextEditor.tsx` exactly as `PostForm` already does.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (`supabase-js` + MCP for migrations), Tiptap v3, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-01-job-expiry-and-rich-text-design.md`

## Global Constraints

- Branch is `feat/job-expiry`, based on `master`. Do not rebase onto `feat/turnstile`.
- Manila is **UTC+8 with no DST, ever**. Use a hardcoded `+08:00`; do not add a timezone library.
- `expires_at` semantics: the date the user types is the **last day applications are accepted**, stored as that day's `23:59:59.999+08:00`.
- **Never** write `status = 'closed'` on expiry. Expiry hides; it does not close, and it never deletes.
- Expiry is **not shown to candidates** — admin-only.
- The project keeps **no local `supabase/migrations` directory**. Schema changes go through the `mcp__supabase__apply_migration` MCP tool.
- Tests run with `npm test` (`vitest run`). Typecheck with a bare `npx tsc --noEmit` — **do not pipe it into `head`/`tail`**, which swallows its exit code and has produced false passes on this project before.
- Every file already exists unless the task says "Create".

---

### Task 1: Manila date helpers

**Files:**
- Create: `lib/dates.ts`
- Test: `lib/dates.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `manilaEndOfDay(input: string): string | null | undefined` — ISO instant for the end of that Manila day; `null` when the input is blank (cleared); `undefined` when malformed (typo).
  - `toDateInput(ts: string | null | undefined): string` — `"yyyy-mm-dd"` in Manila time; `""` when null/unparseable.

- [ ] **Step 1: Write the failing test**

Create `lib/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { manilaEndOfDay, toDateInput } from "./dates";

describe("manilaEndOfDay", () => {
  it("maps a date to the last instant of that day in Manila", () => {
    // 23:59:59.999+08:00 is 15:59:59.999Z the same day.
    expect(manilaEndOfDay("2026-08-15")).toBe("2026-08-15T15:59:59.999Z");
  });

  it("returns null for a blank field, meaning no expiry", () => {
    expect(manilaEndOfDay("")).toBeNull();
    expect(manilaEndOfDay("   ")).toBeNull();
  });

  it("returns undefined for malformed input so a typo is not read as cleared", () => {
    expect(manilaEndOfDay("garbage")).toBeUndefined();
    expect(manilaEndOfDay("15/08/2026")).toBeUndefined();
    expect(manilaEndOfDay("2026-13-40")).toBeUndefined();
    expect(manilaEndOfDay("2026-02-30")).toBeUndefined();
  });
});

describe("toDateInput", () => {
  it("reads the stored instant back as the Manila calendar date", () => {
    // The instant falls on 15 Aug in UTC and 15 Aug in Manila.
    expect(toDateInput("2026-08-15T15:59:59.999Z")).toBe("2026-08-15");
  });

  it("uses the Manila date when UTC is still on the previous day", () => {
    // 16:30Z on 14 Aug is 00:30 on 15 Aug in Manila.
    expect(toDateInput("2026-08-14T16:30:00.000Z")).toBe("2026-08-15");
  });

  it("round-trips a value produced by manilaEndOfDay", () => {
    expect(toDateInput(manilaEndOfDay("2026-12-31") as string)).toBe(
      "2026-12-31",
    );
  });

  it("returns an empty string for null or unparseable input", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(undefined)).toBe("");
    expect(toDateInput("not a date")).toBe("");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run lib/dates.test.ts`
Expected: FAIL — `Failed to resolve import "./dates"`.

- [ ] **Step 3: Write the implementation**

Create `lib/dates.ts`:

```ts
/**
 * Manila is UTC+8 and has never observed DST, so a fixed offset is exact and
 * spares us a timezone library.
 */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** What <input type="date"> submits. Anything else is a typo, not a date. */
const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn an <input type="date"> value into the instant that day ends in Manila.
 *
 * Blank gives null (no expiry) and malformed gives undefined, so the caller can
 * tell "cleared" from "typo" and refuse to silently drop a date someone meant
 * to set.
 */
export function manilaEndOfDay(input: string): string | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!DATE_INPUT.test(trimmed)) return undefined;
  // Date.parse validates ISO dates strictly, so 2026-02-30 is rejected here.
  const ms = Date.parse(`${trimmed}T23:59:59.999+08:00`);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/**
 * The reverse: a stored timestamptz back to the yyyy-mm-dd the date input
 * expects. An instant late in a Manila day belongs to the *previous* UTC day,
 * so shift before formatting or the form shows the wrong date by one.
 */
export function toDateInput(ts: string | null | undefined): string {
  if (!ts) return "";
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run lib/dates.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts lib/dates.test.ts
git commit -m "Add Manila date helpers for the job expiry field"
```

---

### Task 2: Job visibility predicates

**Files:**
- Create: `lib/jobs.ts`
- Test: `lib/jobs.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isExpired(expiresAt: string | null | undefined, now?: Date): boolean`
  - `acceptsApplications(job: { status: string; expires_at: string | null }, now?: Date): boolean`
  - `notExpiredFilter(now?: Date): string` — a PostgREST `.or()` argument.

- [ ] **Step 1: Write the failing test**

Create `lib/jobs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { acceptsApplications, isExpired, notExpiredFilter } from "./jobs";

const NOW = new Date("2026-08-15T12:00:00.000Z");

describe("isExpired", () => {
  it("treats a job with no expiry as never expiring", () => {
    expect(isExpired(null, NOW)).toBe(false);
    expect(isExpired(undefined, NOW)).toBe(false);
  });

  it("is false while the expiry is still in the future", () => {
    expect(isExpired("2026-08-15T15:59:59.999Z", NOW)).toBe(false);
  });

  it("is true once the expiry has passed", () => {
    expect(isExpired("2026-08-14T15:59:59.999Z", NOW)).toBe(true);
  });

  it("counts the exact instant as expired", () => {
    expect(isExpired("2026-08-15T12:00:00.000Z", NOW)).toBe(true);
  });

  it("hides a job whose expiry cannot be parsed", () => {
    // Unreachable from a timestamptz column, but failing closed is the safe
    // direction: better a hidden job than one taking applications it should not.
    expect(isExpired("nonsense", NOW)).toBe(true);
  });
});

describe("acceptsApplications", () => {
  it("accepts an open job with no expiry", () => {
    expect(acceptsApplications({ status: "open", expires_at: null }, NOW)).toBe(
      true,
    );
  });

  it("rejects a closed job even when the expiry is in the future", () => {
    expect(
      acceptsApplications(
        { status: "closed", expires_at: "2026-09-01T15:59:59.999Z" },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects an open job whose expiry has passed", () => {
    expect(
      acceptsApplications(
        { status: "open", expires_at: "2026-08-14T15:59:59.999Z" },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("notExpiredFilter", () => {
  it("builds a PostgREST or-filter against the given instant", () => {
    expect(notExpiredFilter(NOW)).toBe(
      "expires_at.is.null,expires_at.gt.2026-08-15T12:00:00.000Z",
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run lib/jobs.test.ts`
Expected: FAIL — `Failed to resolve import "./jobs"`.

- [ ] **Step 3: Write the implementation**

Create `lib/jobs.ts`:

```ts
/**
 * Expiry is derived, never written back to `status`, so the same predicate has
 * to hold everywhere a job is read: the two careers pages, the sitemap, the
 * admin list, and the apply route.
 */

/** A job with no expiry never expires; otherwise it hides once the instant passes. */
export function isExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  // A timestamptz column cannot produce this, but fail closed if it somehow does.
  if (Number.isNaN(ms)) return true;
  return ms <= now.getTime();
}

/** Whether a job may still receive applications. */
export function acceptsApplications(
  job: { status: string; expires_at: string | null },
  now: Date = new Date(),
): boolean {
  return job.status === "open" && !isExpired(job.expires_at, now);
}

/**
 * PostgREST `.or()` argument matching jobs that have not expired. It mirrors
 * the public RLS policy rather than replacing it — the policy is what actually
 * stops the anon key reading an expired row.
 */
export function notExpiredFilter(now: Date = new Date()): string {
  return `expires_at.is.null,expires_at.gt.${now.toISOString()}`;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run lib/jobs.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/jobs.ts lib/jobs.test.ts
git commit -m "Add the job expiry predicates shared by every read path"
```

---

### Task 3: Schema, RLS policy, and generated types

**Files:**
- Modify: `lib/database.types.ts:156-201` (the `jobs` Row / Insert / Update blocks)
- Migration: applied through the `mcp__supabase__apply_migration` MCP tool (no local SQL file)

**Interfaces:**
- Consumes: nothing.
- Produces: `jobs.expires_at` (`timestamptz`, nullable) and `Database["public"]["Tables"]["jobs"]["Row"]["expires_at"]: string | null`, which every later task reads.

- [ ] **Step 1: Apply the migration**

Call `mcp__supabase__apply_migration` with name `add_expires_at_to_jobs` and this query:

```sql
alter table public.jobs add column expires_at timestamptz;

create index jobs_public_read_idx on public.jobs (status, expires_at);

-- Enforce expiry at the database, not only in queries. All three public read
-- paths (/careers, /careers/[slug], sitemap) use the anon key, so this covers
-- them even if a query forgets its filter.
drop policy "jobs public read open" on public.jobs;
create policy "jobs public read open" on public.jobs for select to public
  using (status = 'open' and (expires_at is null or expires_at > now()));
```

- [ ] **Step 2: Verify the column and the policy landed**

Call `mcp__supabase__execute_sql` with:

```sql
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'jobs'
       and column_name = 'expires_at' and data_type = 'timestamp with time zone') as has_column,
  (select qual from pg_policies
     where schemaname = 'public' and tablename = 'jobs'
       and policyname = 'jobs public read open') as public_qual;
```

Expected: `has_column` is `1`, and `public_qual` mentions both `status = 'open'` and `expires_at`.

- [ ] **Step 3: Prove the policy actually hides an expired job**

Call `mcp__supabase__execute_sql` with:

```sql
begin;
insert into public.jobs (slug, title, status, expires_at)
values ('rls-expiry-probe', 'RLS expiry probe', 'open', now() - interval '1 day');

set local role anon;
select count(*) as visible_to_anon from public.jobs where slug = 'rls-expiry-probe';
rollback;
```

Expected: `visible_to_anon` is `0`. If it is `1`, the policy is wrong — stop and fix it before continuing. The `rollback` leaves no data behind.

- [ ] **Step 4: Add the column to the generated types**

In `lib/database.types.ts`, inside `jobs`, add one line to each of the three blocks, keeping the existing alphabetical order (immediately after the `description` line in each):

- `Row` (after line 161 `description: Json | null`): `          expires_at: string | null`
- `Insert` (after line 176 `description?: Json | null`): `          expires_at?: string | null`
- `Update` (after line 191 `description?: Json | null`): `          expires_at?: string | null`

Edit by hand rather than regenerating the whole file — a full regen churns unrelated tables and generator metadata, which buries this three-line change in review.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output. (Run it bare — piping it into `head` hides a failure.)

- [ ] **Step 6: Commit**

```bash
git add lib/database.types.ts
git commit -m "Add jobs.expires_at and fold expiry into the public read policy"
```

---

### Task 4: Render underline and strike marks

**Files:**
- Modify: `lib/tiptap.ts:26-34` (the mark loop in `renderText`)
- Test: `lib/tiptap.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderTiptap` output containing `<u>` and `<s>`; no signature change.

- [ ] **Step 1: Write the failing test**

Append to `lib/tiptap.test.ts`, inside the existing `describe("renderTiptap", …)` block:

```ts
  it("renders underline and strike marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "under", marks: [{ type: "underline" }] },
            { type: "text", text: "struck", marks: [{ type: "strike" }] },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe(
      "<p><u>under</u><s>struck</s></p>",
    );
  });

  it("nests bold and underline on the same run", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "both",
              marks: [{ type: "bold" }, { type: "underline" }],
            },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe("<p><u><strong>both</strong></u></p>");
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run lib/tiptap.test.ts`
Expected: FAIL — the underline test gets `<p>understruck</p>`, because unknown marks are currently dropped.

- [ ] **Step 3: Handle the two marks**

In `lib/tiptap.ts`, in the `for (const mark of node.marks ?? [])` loop, add two branches after the `italic` line:

```ts
    else if (mark.type === "underline") html = `<u>${html}</u>`;
    else if (mark.type === "strike") html = `<s>${html}</s>`;
```

Strike has no toolbar button, but StarterKit registers it and a paste can carry it; without this branch it renders as unmarked text and the author's meaning is lost silently.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run lib/tiptap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tiptap.ts lib/tiptap.test.ts
git commit -m "Render underline and strike marks in job and post content"
```

---

### Task 5: Underline button in the shared editor

**Files:**
- Modify: `components/admin/RichTextEditor.tsx:6-17` (icon imports) and `:60-67` (toolbar)

**Interfaces:**
- Consumes: `renderTiptap`'s underline support from Task 4.
- Produces: no API change — `RichTextEditor({ value, onChange })` is unchanged. The button appears in the blog editor too, since the component is shared.

**Verified:** Tiptap v3.28's StarterKit already registers `underline` in its default extension list. **No new dependency and no `configure` change is needed** — `editor.chain().focus().toggleUnderline().run()` works as-is.

- [ ] **Step 1: Import the icon**

In `components/admin/RichTextEditor.tsx`, add `Underline` to the existing `lucide-react` import, after `Italic`:

```ts
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  // …rest unchanged
} from "lucide-react";
```

- [ ] **Step 2: Add the toolbar button**

In `Toolbar`, immediately after the Italic `ToolbarButton` and before the `<span className="mx-1 h-5 w-px bg-black/10" />` separator:

```tsx
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-4" />
      </ToolbarButton>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output. A failure on `toggleUnderline` means StarterKit is not registering the extension after all — in that case `npm install @tiptap/extension-underline@^3.28.0`, import it, and add it to the `extensions` array.

- [ ] **Step 4: Verify it works in the browser**

Run `npm run dev`, open `/admin/posts/new`, type a word, select it, click the **U** button. Expected: the text is underlined and the button shows the active purple state.

- [ ] **Step 5: Commit**

```bash
git add components/admin/RichTextEditor.tsx
git commit -m "Add an underline button to the admin rich-text toolbar"
```

---

### Task 6: Move job descriptions onto the rich-text editor

**Files:**
- Modify: `components/admin/JobForm.tsx` (imports, `Values`, description field)
- Modify: `app/admin/jobs/actions.ts:1-37` (imports and `parse`)
- Modify: `app/admin/jobs/[id]/page.tsx:6` and `:60`
- Modify: `lib/tiptap.ts:77-184` (delete `textToDoc`, `docToText`, and their helpers)
- Modify: `lib/tiptap.test.ts` (delete their suites)

**Interfaces:**
- Consumes: `RichTextEditor` from Task 5.
- Produces: `JobForm`'s `values.description` becomes `Json | null` (was `string`). The form posts a `description` field holding `JSON.stringify(doc)`.

**Note:** the three existing job rows are clean structured Tiptap JSON — no embedded newlines in text nodes, real `hardBreak` nodes, no marks. They load into the editor losslessly, so there is no data migration.

- [ ] **Step 1: Swap the field in `JobForm`**

In `components/admin/JobForm.tsx`:

Change the React import and add the editor and `Json` type:

```tsx
import { useActionState, useState } from "react";
```

```tsx
import { RichTextEditor } from "./RichTextEditor";
import type { Json } from "@/lib/database.types";
```

Change `Values.description` from `description?: string;` to:

```tsx
  description?: Json | null;
```

Inside the component, after the `useActionState` call, add:

```tsx
  const [description, setDescription] = useState<Json>(
    values.description ?? { type: "doc", content: [{ type: "paragraph" }] },
  );
```

Replace the whole `<Field label="Description" …>` block (the one wrapping the `Textarea`) with:

```tsx
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
```

`Textarea` is still used by the short-description field, so leave that import alone.

- [ ] **Step 2: Parse the posted JSON in the action**

In `app/admin/jobs/actions.ts`, delete the `textToDoc` import (line 7) and add above `parse`:

```ts
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] } as unknown as Json;

/** The editor posts its document as JSON; fall back to empty rather than throwing. */
function parseDoc(raw: string): Json {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Json;
  } catch {
    // A malformed body should not 500 the whole save.
  }
  return EMPTY_DOC;
}
```

Add the `Json` type import at the top:

```ts
import type { Json } from "@/lib/database.types";
```

Then change the `description` line inside `parse`:

```ts
  const description = parseDoc(String(formData.get("description") ?? ""));
```

- [ ] **Step 3: Pass the raw document from the edit page**

In `app/admin/jobs/[id]/page.tsx`, delete the `docToText` import (line 6) and change line 60 to:

```tsx
            description: job.description,
```

- [ ] **Step 4: Delete the now-dead conversion code**

In `lib/tiptap.ts`, delete `BULLET_LINE`, `linesToInline`, `textToDoc`, `blockToText`, and `docToText` — everything from the `/** A line opening with a bullet glyph… */` comment to the end of the file. Keep `renderTiptap` and everything above it, **including** the `\n → <br/>` handling inside `renderText`, which still serves older rows.

In `lib/tiptap.test.ts`: delete the `describe("textToDoc", …)` and `describe("docToText round trip", …)` blocks, drop `docToText` and `textToDoc` from the import, and delete the `doc()` helper at the top. Rewrite the file's header comment as:

```ts
/**
 * Job and post bodies are authored in Tiptap and stored as its JSON, so these
 * tests are about rendering that JSON to HTML safely — escaping, marks, and the
 * legacy rows that kept their line breaks inside a text node.
 */
```

The first `renderTiptap` test builds its input with `textToDoc`. Replace it with a literal document:

```ts
  it("renders a bulletList as ul/li", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "One" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Two" }] },
              ],
            },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe(
      "<ul><li><p>One</p></li><li><p>Two</p></li></ul>",
    );
  });
```

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS, with no remaining reference to `textToDoc` or `docToText`.

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

Run: `git grep -n "textToDoc\|docToText"`
Expected: no matches outside `docs/`.

- [ ] **Step 6: Verify a real job round-trips**

Run `npm run dev`, open `/admin/jobs`, edit **Project Manager**. Expected: its headings and bullet lists appear as formatted content in the editor, not as raw text or a wall of prose. Bold one word, save, then open `/careers/project-manager` and confirm the word is bold and the bullets still render. Undo the bold and save again.

- [ ] **Step 7: Commit**

```bash
git add components/admin/JobForm.tsx app/admin/jobs/actions.ts "app/admin/jobs/[id]/page.tsx" lib/tiptap.ts lib/tiptap.test.ts
git commit -m "Edit job descriptions in the rich-text editor"
```

---

### Task 7: The expiry field in the admin

**Files:**
- Modify: `components/admin/JobForm.tsx` (the two-column grid)
- Modify: `app/admin/jobs/actions.ts` (`parse`, `createJob`, `updateJob`)
- Modify: `app/admin/jobs/[id]/page.tsx` (`values`)
- Modify: `app/admin/jobs/page.tsx:56-76` (badge and meta line)

**Interfaces:**
- Consumes: `manilaEndOfDay`, `toDateInput` (Task 1); `isExpired` (Task 2); `jobs.expires_at` (Task 3).
- Produces: the form posts `expires_at` as `"yyyy-mm-dd"` or `""`; the column stores an ISO instant or null.

- [ ] **Step 1: Add the field to the form**

In `components/admin/JobForm.tsx`, add to `Values`:

```tsx
  expires_at?: string;
```

Add a fifth `Field` inside the existing `<div className="grid gap-5 sm:grid-cols-2">`, after the Status field:

```tsx
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
```

`TextInput` spreads arbitrary input props, so `type="date"` needs no new primitive.

- [ ] **Step 2: Convert and validate it in the action**

In `app/admin/jobs/actions.ts`, import the helper:

```ts
import { manilaEndOfDay } from "@/lib/dates";
```

Inside `parse`, add before the `return`:

```ts
  // null = cleared, undefined = malformed. The callers reject undefined so a
  // typo never silently wipes an expiry date.
  const expires_at = manilaEndOfDay(String(formData.get("expires_at") ?? ""));
```

and add `expires_at` to the returned object.

In **both** `createJob` and `updateJob`, add a third guard next to the existing ones:

```ts
  if (data.expires_at === undefined)
    return { error: "Enter a valid expiry date." };
```

- [ ] **Step 3: Repopulate the field when editing**

In `app/admin/jobs/[id]/page.tsx`, import the helper:

```tsx
import { toDateInput } from "@/lib/dates";
```

and add to the `values` object passed to `JobForm`:

```tsx
            expires_at: toDateInput(job.expires_at),
```

- [ ] **Step 4: Show expiry in the jobs list**

In `app/admin/jobs/page.tsx`, import:

```tsx
import { isExpired } from "@/lib/jobs";
import { toDateInput } from "@/lib/dates";
```

Immediately after the status `<span>` (the one rendering `{job.status}`), add:

```tsx
                  {isExpired(job.expires_at) && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      expired
                    </span>
                  )}
```

and replace the meta line's array with:

```tsx
                  {[
                    job.department,
                    job.location,
                    job.work_mode,
                    job.expires_at && `expires ${toDateInput(job.expires_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
```

Without the badge, a job disappearing from `/careers` while its admin row still reads "open" looks like a bug.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 6: Verify the round trip in the browser**

With `npm run dev` running, at `/admin/jobs`:

1. Edit any job, set **Expires on** to a date well in the future, save. Reopen it — the same date is shown, not one day off. This is the bug the `toDateInput` shift exists to prevent.
2. Confirm the list row now reads `… · expires <that date>` with no badge.
3. Clear the field and save. The expiry column and the meta text both disappear.

- [ ] **Step 7: Commit**

```bash
git add components/admin/JobForm.tsx app/admin/jobs/actions.ts "app/admin/jobs/[id]/page.tsx" app/admin/jobs/page.tsx
git commit -m "Add an expiry date to the job admin form and listing"
```

---

### Task 8: Filter expired jobs out of the public site

**Files:**
- Modify: `app/(site)/careers/page.tsx:27-31`
- Modify: `app/(site)/careers/[slug]/page.tsx:19-37` (`generateStaticParams` and `getJob`)
- Modify: `app/sitemap.ts:35`

**Interfaces:**
- Consumes: `notExpiredFilter` (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Filter the careers listing**

In `app/(site)/careers/page.tsx`, import:

```ts
import { notExpiredFilter } from "@/lib/jobs";
```

and add one line to the query:

```ts
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, slug, title, department, location, work_mode, short_description")
    .eq("status", "open")
    .or(notExpiredFilter())
    .order("created_at", { ascending: false });
```

- [ ] **Step 2: Filter the detail page and its static params**

In `app/(site)/careers/[slug]/page.tsx`, import `notExpiredFilter` the same way and add `.or(notExpiredFilter())` to **both** queries:

```ts
  const { data } = await supabase
    .from("jobs")
    .select("slug")
    .eq("status", "open")
    .or(notExpiredFilter());
```

```ts
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "open")
    .or(notExpiredFilter())
    .single();
```

`getJob` uses `.single()`, so an expired slug returns null and the page already calls `notFound()` — the URL 404s rather than rendering.

- [ ] **Step 3: Filter the sitemap**

In `app/sitemap.ts`, import `notExpiredFilter` and change the jobs query:

```ts
    supabase
      .from("jobs")
      .select("slug, updated_at")
      .eq("status", "open")
      .or(notExpiredFilter()),
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/careers/page.tsx" "app/(site)/careers/[slug]/page.tsx" app/sitemap.ts
git commit -m "Hide expired jobs from careers, job detail, and the sitemap"
```

---

### Task 9: Refuse applications to closed or expired roles

**Files:**
- Modify: `app/api/apply/route.ts:71-80` (between the service-client guard and the CV upload)

**Interfaces:**
- Consumes: `acceptsApplications` (Task 2).
- Produces: a `400` response with `"This role is no longer accepting applications."`

- [ ] **Step 1: Add the guard**

In `app/api/apply/route.ts`, import:

```ts
import { acceptsApplications } from "@/lib/jobs";
```

Insert this **after** the `const supabase = getServiceClient()` block and **before** the `// Upload CV to the private bucket.` comment:

```ts
  // A closed or expired role must not take applications. The public pages
  // filter it out and RLS hides it from the anon key, but this route uses the
  // service client — which bypasses RLS — on a jobId taken from the request.
  // Checked before the upload so a rejected submission leaves no file behind.
  if (jobId) {
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("status, expires_at")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job || !acceptsApplications(job)) {
      return NextResponse.json(
        { ok: false, error: "This role is no longer accepting applications." },
        { status: 400 },
      );
    }
  }
```

An empty `jobId` stays allowed — that is the general-application path. A malformed uuid makes the query error, which `jobErr` catches.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 3: Verify a live job still accepts an application**

With `npm run dev` running, get an open job's id:

Call `mcp__supabase__execute_sql` with `select id, slug from public.jobs where status = 'open' limit 1;`

Then, in bash:

```bash
printf 'cv' > /tmp/cv.pdf
curl -s -X POST http://localhost:3000/api/apply \
  -F "jobId=<THE-ID>" -F "first_name=Test" -F "last_name=Applicant" \
  -F "email=test@example.com" -F "cv=@/tmp/cv.pdf"
```

Expected: `{"ok":true}`. If it fails on Turnstile, this branch does not have that check — a failure here is a real regression.

Clean up the row and its upload afterwards:

```sql
delete from public.applications where email = 'test@example.com';
```

and delete the matching object from the `cvs` bucket in the Supabase dashboard — deleting the row does **not** remove the file.

- [ ] **Step 4: Verify an expired job is refused**

Set that job's expiry to yesterday through `/admin/jobs` (not raw SQL), then re-run the same `curl`.

Expected: `{"ok":false,"error":"This role is no longer accepting applications."}`.

Then confirm **no** new object appeared under that job's id prefix in the `cvs` bucket — the guard runs before the upload, so a refused application must leave storage untouched.

- [ ] **Step 5: Commit**

```bash
git add app/api/apply/route.ts
git commit -m "Refuse applications to closed or expired roles"
```

---

### Task 10: End-to-end verification

**Files:** none — this task produces evidence, not code.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified feature.

- [ ] **Step 1: Set up the scenario**

With `npm run dev` running, at `/admin/jobs`, set one open job's **Expires on** to **yesterday** and save. Note its slug.

Next.js dev mode re-renders per request, so ISR's 60-second window does not apply here. Against a deployed environment it does — and each URL caches independently, so **load every URL twice** before concluding anything.

- [ ] **Step 2: Walk the checklist**

- [ ] `/careers` — the job is gone from the grid.
- [ ] `/careers/<slug>` — 404s.
- [ ] `/sitemap.xml` — no entry for that slug.
- [ ] `/admin/jobs` — the row shows the amber **expired** badge, still reads `open`, and the meta line shows the date.
- [ ] `POST /api/apply` with that job's id — `400`, and no new file in the `cvs` bucket.
- [ ] Change the expiry to a future date and save — the job returns to `/careers`, its detail page renders, and the badge is gone. Nothing needed a second write to `status`.

- [ ] **Step 3: Confirm the data was never destroyed**

Call `mcp__supabase__execute_sql` with:

```sql
select slug, status, expires_at from public.jobs order by created_at;
```

Expected: all three rows still present, `status` untouched by expiry — only `expires_at` changed. Expiry hides; it never closes and never deletes.

- [ ] **Step 4: Full gate**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

Run: `npm run build`
Expected: build succeeds. It exercises `generateStaticParams` and `sitemap.ts` against the real database, which the unit tests do not.

- [ ] **Step 5: Clear the test expiry**

Clear the **Expires on** field on the job you used and save, so no leftover date ships. Confirm at `/admin/jobs` that its meta line no longer mentions an expiry.

- [ ] **Step 6: Commit any stragglers**

```bash
git status
```

Expected: clean. If anything is outstanding, commit it before opening a PR.
