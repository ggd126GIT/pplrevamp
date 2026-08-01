# Share Buttons and Rich Link Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a share row on blog posts and job postings, and make a pasted link to either render as a card with title, image, and snippet.

**Architecture:** Two independent halves. The preview half is metadata only — two new dynamic `opengraph-image` routes reusing the existing `ogCard()` helper, plus `og:url` / `siteName` / `publishedTime` / `twitter:card=summary_large_image` on both detail pages. The share half is one `<ShareLinks>` client component used by both pages, with all URL construction in a plain `lib/share.ts` module so it is unit-testable.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind, Supabase (`createPublicClient`), Satori via `next/og`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-01-post-share-and-link-previews-design.md`

## Global Constraints

- Branch is `feat/post-sharing`, based on `master`. Do not rebase onto `feat/turnstile` or `feat/job-expiry`.
- **No third-party script, SDK, or new dependency.** Plain `https://` share links only — anything else reintroduces the cookie-consent question the first-party analytics was designed to avoid.
- **Lucide has no brand icons.** `Linkedin`, `Facebook` and `Twitter` are absent from the installed `lucide-react` (verified). Brand marks must be inline SVG.
- Tests run with `npm test` (`vitest run`). Typecheck with a bare `npx tsc --noEmit` — **do not pipe it into `head`/`tail`**, which swallows the exit code and has produced false passes on this project.
- `vitest.config.ts` is `environment: "node"` with `include: ["**/*.test.ts"]`. It **cannot load `.tsx`** — no component tests. Logic that needs testing goes in `.ts`.
- If `npx tsc --noEmit` reports errors inside `.next/`, they are torn dev-server artifacts, not source bugs. Run `rm -f .next/dev/types/routes.d.ts .next/dev/types/validator.ts` and re-run.
- A dev server may already be running on :3000; `next dev` refuses a second instance. Reuse it.
- The canonical base URL is `site.url` in `lib/site.ts` (`NEXT_PUBLIC_SITE_URL` with a production fallback). Never read `window.location`.
- Never commit `.claude/settings.local.json`.
- End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

### Task 1: Share URL builders

**Files:**
- Create: `lib/share.ts`
- Test: `lib/share.test.ts`

**Interfaces:**
- Consumes: `site` from `@/lib/site`.
- Produces: `absoluteUrl(path: string): string` and `shareLinks(url: string, title: string): ShareTargets` where `ShareTargets = { linkedin: string; facebook: string; x: string }`. Tasks 3, 4, 5 and 6 all import these.

- [ ] **Step 1: Write the failing test**

Create `lib/share.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { absoluteUrl, shareLinks } from "./share";

describe("absoluteUrl", () => {
  it("joins a root-relative path onto the site origin", () => {
    expect(absoluteUrl("/blog/hello")).toBe(
      "https://www.pplsolutionsinc.com/blog/hello",
    );
  });

  it("does not double the slash", () => {
    expect(absoluteUrl("/careers/project-manager")).not.toContain("//careers");
  });
});

describe("shareLinks", () => {
  const url = "https://www.pplsolutionsinc.com/blog/hello";

  it("builds a LinkedIn share URL with the target encoded", () => {
    expect(shareLinks(url, "Hello").linkedin).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.pplsolutionsinc.com%2Fblog%2Fhello",
    );
  });

  it("builds a Facebook sharer URL", () => {
    expect(shareLinks(url, "Hello").facebook).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.pplsolutionsinc.com%2Fblog%2Fhello",
    );
  });

  it("carries the title into the X intent", () => {
    expect(shareLinks(url, "Hello").x).toContain("&text=Hello");
  });

  // The real copy is full of these; an unencoded & or # truncates the share.
  it("encodes ampersands, hashes and question marks in the title", () => {
    const { x } = shareLinks(url, "Q&A: why #BPO? ");
    expect(x).toContain("Q%26A%3A%20why%20%23BPO%3F");
    expect(x).not.toContain("&text=Q&A");
  });

  it("encodes the em dashes the site's headings use", () => {
    expect(shareLinks(url, "Offshoring — explained").x).toContain(
      "Offshoring%20%E2%80%94%20explained",
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- lib/share.test.ts`
Expected: FAIL — `Failed to resolve import "./share"`.

- [ ] **Step 3: Write the implementation**

Create `lib/share.ts`:

```ts
/**
 * Share-link construction. Pure string work with no DOM access, kept out of the
 * component because vitest runs `environment: "node"` and only collects
 * `**\/*.test.ts` — logic in a `.tsx` file cannot be tested at all.
 */
import { site } from "@/lib/site";

export type ShareTargets = {
  linkedin: string;
  facebook: string;
  x: string;
};

/** Absolute URL for a root-relative path, from `NEXT_PUBLIC_SITE_URL`. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/**
 * Plain share endpoints — no SDK, so no third-party cookie and no consent
 * banner. Each network reads only the `url`; X also accepts prefill text.
 */
export function shareLinks(url: string, title: string): ShareTargets {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- lib/share.test.ts`
Expected: PASS, 6 tests.

> If `absoluteUrl` fails because `NEXT_PUBLIC_SITE_URL` is set in the shell to a staging host, that is the test telling the truth — the fallback in `lib/site.ts` is `https://www.pplsolutionsinc.com`. Run the suite without that variable set.

- [ ] **Step 5: Commit**

```bash
git add lib/share.ts lib/share.test.ts
git commit -m "$(cat <<'EOF'
Add share URL builders

Kept in a plain .ts module because vitest is node-environment and only
collects *.test.ts, so anything living in the component would be
untestable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Shared brand icons

**Files:**
- Create: `components/icons/brand.tsx`
- Modify: `components/Footer.tsx:6-30` (delete the two local icon components), `components/Footer.tsx:1-4` (add the import)

**Interfaces:**
- Produces: `LinkedInIcon`, `FacebookIcon`, `XIcon`, each `({ className }: { className?: string }) => JSX.Element`. Task 3 imports all three.

**Why:** `Footer.tsx` already defines `LinkedInIcon` and `FacebookIcon` privately. Lucide ships no brand icons, so `ShareLinks` needs these exact SVGs — copying them would leave two divergent sets.

- [ ] **Step 1: Create the shared module**

Create `components/icons/brand.tsx`. The LinkedIn and Facebook paths are moved **verbatim** from `Footer.tsx`:

```tsx
/**
 * Brand marks as inline SVG. Lucide dropped its brand icons, so these cannot
 * come from `lucide-react`. Shared by the footer's social links and the
 * per-post share row.
 */

function Glyph({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </Glyph>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </Glyph>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Glyph>
  );
}
```

- [ ] **Step 2: Point the footer at the shared module**

In `components/Footer.tsx`, delete the local `LinkedInIcon` and `FacebookIcon` function declarations (lines 6-30) and add to the imports:

```tsx
import { FacebookIcon, LinkedInIcon } from "@/components/icons/brand";
```

Change nothing else in that file — the two `<LinkedInIcon className="size-5" />` / `<FacebookIcon className="size-5" />` call sites keep working unchanged.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 4: Confirm the footer still renders both icons**

With the dev server on :3000:

```bash
curl -s http://localhost:3000/ | grep -c 'aria-label="LinkedIn"'
curl -s http://localhost:3000/ | grep -c 'aria-label="Facebook"'
```

Expected: `1` for each. A `0` means the import broke the render.

- [ ] **Step 5: Commit**

```bash
git add components/icons/brand.tsx components/Footer.tsx
git commit -m "$(cat <<'EOF'
Extract the brand icons out of the footer

The share row needs the same LinkedIn and Facebook marks, and lucide-react
ships no brand icons, so duplicating them would leave two sets to drift.
Adds the X mark alongside.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The share row component

**Files:**
- Create: `components/ShareLinks.tsx`

**Interfaces:**
- Consumes: `shareLinks` from `@/lib/share` (Task 1); `LinkedInIcon`, `FacebookIcon`, `XIcon` from `@/components/icons/brand` (Task 2).
- Produces: `<ShareLinks url={string} title={string} />`. Task 4 renders it on both detail pages.

**Note on `url`:** it is a required prop, always passed from the server. The component must never derive it from `window.location` — that would bake the staging host into shared links and break the cutover flip.

- [ ] **Step 1: Write the component**

Create `components/ShareLinks.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/icons/brand";
import { shareLinks } from "@/lib/share";

const CONTROL =
  "inline-flex size-10 items-center justify-center rounded-full border border-black/[0.08] text-charcoal/70 transition-colors hover:border-purple hover:text-purple";

/**
 * Share row. `url` is absolute and supplied by the server so the links follow
 * `NEXT_PUBLIC_SITE_URL` and correct themselves at cutover; reading
 * `window.location` here would hand out staging URLs.
 */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(url, title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied. Say nothing rather than claim a
      // copy that did not happen.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <span className="text-sm font-semibold text-charcoal/60">Share</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy link"
          data-track-click="share-copy"
          className={CONTROL}
        >
          {copied ? (
            <Check className="size-4 text-purple" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
        <a
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          data-track-click="share-linkedin"
          className={CONTROL}
        >
          <LinkedInIcon className="size-4" />
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          data-track-click="share-facebook"
          className={CONTROL}
        >
          <FacebookIcon className="size-4" />
        </a>
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          data-track-click="share-x"
          className={CONTROL}
        >
          <XIcon className="size-4" />
        </a>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
```

**Tracking contract:** `classifyClick` in `lib/analytics/clicks.ts` treats an explicit `data-track-click` as the winning label. The three anchors would otherwise be recorded as generic external links, and the copy `<button>` has no `href` so it would not be recorded at all.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 3: Commit**

```bash
git add components/ShareLinks.tsx
git commit -m "$(cat <<'EOF'
Add the share row component

Four controls: copy link, LinkedIn, Facebook, X. The URL is a required
prop from the server rather than window.location, so shared links follow
NEXT_PUBLIC_SITE_URL instead of baking in the staging host.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Render the share row on both detail pages

**Files:**
- Modify: `app/(site)/blog/[slug]/page.tsx` (imports; after the `rich-content` div at lines 108-111)
- Modify: `app/(site)/careers/[slug]/page.tsx` (imports; after the description block in the left column)

**Interfaces:**
- Consumes: `<ShareLinks>` (Task 3), `absoluteUrl` (Task 1).

- [ ] **Step 1: Add the row to the blog post**

In `app/(site)/blog/[slug]/page.tsx`, add to the imports:

```tsx
import { ShareLinks } from "@/components/ShareLinks";
import { absoluteUrl } from "@/lib/share";
```

Then, directly after the `rich-content` div and before the closing `</Container>`:

```tsx
          <div className="mt-12 border-t border-black/[0.06] pt-6">
            <ShareLinks
              url={absoluteUrl(`/blog/${post.slug}`)}
              title={post.title}
            />
          </div>
```

- [ ] **Step 2: Add the row to the job posting**

In `app/(site)/careers/[slug]/page.tsx`, add the same two imports. Then, inside the left column `<div>`, after the `{html ? (...) : (...)}` block and before that `</div>`:

```tsx
            <div className="mt-10 border-t border-black/[0.06] pt-6">
              <ShareLinks
                url={absoluteUrl(`/careers/${job.slug}`)}
                title={job.title}
              />
            </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 4: Verify both rows render with correct hrefs**

With the dev server on :3000:

```bash
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo | grep -o 'data-track-click="share-[a-z]*"' | sort
curl -s http://localhost:3000/careers/project-manager | grep -o 'data-track-click="share-[a-z]*"' | sort
```

Expected, for each: `share-copy`, `share-facebook`, `share-linkedin`, `share-x` — four lines.

Then confirm the shared URL is absolute and not the dev host:

```bash
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo | grep -o 'share-offsite/?url=[^"]*'
```

Expected: a percent-encoded URL whose host is `NEXT_PUBLIC_SITE_URL`'s (or the production fallback) — **not** `localhost`.

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/blog/[slug]/page.tsx" "app/(site)/careers/[slug]/page.tsx"
git commit -m "$(cat <<'EOF'
Show the share row on posts and job postings

Closes backlog F1 and F2 with one component rather than two near-copies.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Blog post preview metadata

**Files:**
- Modify: `app/(site)/blog/[slug]/page.tsx:33-51` (`generateMetadata`)

**Interfaces:**
- Consumes: `absoluteUrl` (Task 1), `site` from `@/lib/site`.

**Why:** the live page currently emits no `og:url` and `twitter:card` = `summary`, which renders a small square thumbnail instead of a wide banner.

- [ ] **Step 1: Replace the metadata block**

Add `import { site } from "@/lib/site";` to the imports if not already present, then replace the body of `generateMetadata` after the `if (!post)` guard:

```tsx
  const url = absoluteUrl(`/blog/${slug}`);
  const description = post.excerpt ?? undefined;
  // A real cover wins; when there is none the file-convention
  // `opengraph-image` route supplies a generated card (Task 7).
  const images = post.cover_image_url ? [post.cover_image_url] : undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      siteName: site.name,
      publishedTime: post.published_at ?? undefined,
      images,
    },
    twitter: {
      // Without this the card renders as a small square thumbnail.
      card: "summary_large_image",
      title: post.title,
      description,
      images,
    },
  };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 3: Verify the tags**

```bash
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo \
  | grep -oE '<meta[^>]*(og:|twitter:)[^>]*>'
```

Expected to include `og:url`, `og:site_name`, `og:type` = `article`, and `twitter:card` = `summary_large_image`.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/blog/[slug]/page.tsx"
git commit -m "$(cat <<'EOF'
Give blog posts a full preview card

Adds og:url, site name and published time, and switches the Twitter card
to summary_large_image so a pasted link renders as a wide banner rather
than a small square thumbnail.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Job posting preview metadata

**Files:**
- Modify: `app/(site)/careers/[slug]/page.tsx:42-54` (`generateMetadata`)

**Interfaces:**
- Consumes: `absoluteUrl` (Task 1), `site` from `@/lib/site`.

**Why:** this `generateMetadata` returns only `title` and `description` — there is **no** `openGraph` block at all, so a pasted job link has never had a card.

- [ ] **Step 1: Replace the metadata block**

Add `import { site } from "@/lib/site";` to the imports if not already present, then replace the body after the `if (!job)` guard:

```tsx
  const url = absoluteUrl(`/careers/${slug}`);
  const description =
    job.short_description ?? `Apply for ${job.title} at ${site.name}.`;

  return {
    title: `${job.title} — Careers`,
    description,
    alternates: { canonical: url },
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
```

Jobs have no cover-image column, so `images` is deliberately omitted here — the generated card from Task 7 supplies it.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 3: Verify the tags**

```bash
curl -s http://localhost:3000/careers/project-manager \
  | grep -oE '<meta[^>]*(og:|twitter:)[^>]*>'
```

Expected: an `og:title`, `og:description`, `og:url`, `og:site_name`, `og:type` = `article`, and `twitter:card` = `summary_large_image` — none of which exist before this task.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/careers/[slug]/page.tsx"
git commit -m "$(cat <<'EOF'
Give job postings a preview card

The careers detail page had no openGraph block at all, so a shared role
rendered as a bare link. Its description now comes from the job's own
short description instead of a generic sentence.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Generated OG cards for posts and jobs

**Files:**
- Create: `app/(site)/blog/[slug]/opengraph-image.tsx`
- Create: `app/(site)/careers/[slug]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `ogCard`, `OG_SIZE` from `@/lib/og-card` (**unchanged**); `createPublicClient` from `@/lib/supabase/public`.

**Template:** `app/(site)/blog/opengraph-image.tsx` is the existing static example — copy its export shape (`size`, `contentType`, `alt`, default `Image()`).

- [ ] **Step 1: Create the blog card route**

```tsx
import { ogCard, OG_SIZE } from "@/lib/og-card";
import { createPublicClient } from "@/lib/supabase/public";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Article on the .ppl Solutions blog";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return ogCard({
    eyebrow: "Insights",
    title: data?.title ?? "Perspectives on offshoring, outsourcing, and BPO",
    photo: "blog.jpg",
  });
}
```

- [ ] **Step 2: Create the careers card route**

```tsx
import { ogCard, OG_SIZE } from "@/lib/og-card";
import { createPublicClient } from "@/lib/supabase/public";
import { notExpiredFilter } from "@/lib/jobs";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Open role at .ppl Solutions, Inc.";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("jobs")
    .select("title, department")
    .eq("slug", slug)
    .eq("status", "open")
    .or(notExpiredFilter())
    .single();

  return ogCard({
    eyebrow: data?.department ?? "Careers",
    title: data?.title ?? "Join our team",
    photo: "careers.jpg",
  });
}
```

The expiry filter matters: without it an expired role's card would still render, contradicting the 404 the page itself returns.

- [ ] **Step 3: Typecheck, and fix the params shape if Next disagrees**

Run: `npx tsc --noEmit`
Expected: exits 0.

> **If it errors on `params`:** Next 16 passes `params` to metadata image routes the same way it passes them to pages, and every page in this repo types it as `Promise<{ slug: string }>` and awaits. If the compiler says otherwise here, change the annotation to the plain object `{ slug: string }` and drop the `await` — `await` on a non-thenable is harmless, but the *type* must match what Next declares. Do not guess: let the compiler decide.

- [ ] **Step 4: Verify both cards render**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  http://localhost:3000/blog/why-the-philippines-for-bpo/opengraph-image
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  http://localhost:3000/careers/project-manager/opengraph-image
```

Expected for each: `200 image/png` and a non-trivial byte count (tens of KB, not 0).

> The dev-mode URL may carry a generated suffix. If a bare path 404s, take the real URL from the page's `og:image` tag:
> `curl -s http://localhost:3000/blog/why-the-philippines-for-bpo | grep -o 'og:image[^>]*'`

- [ ] **Step 5: Confirm the card shows the right title**

Open `http://localhost:3000/blog/why-the-philippines-for-bpo/opengraph-image` in a browser. Expected: the post's own title on the brand gradient — not the generic blog-section headline. Do the same for the job card and confirm the eyebrow reads its department.

- [ ] **Step 6: Commit**

```bash
git add "app/(site)/blog/[slug]/opengraph-image.tsx" "app/(site)/careers/[slug]/opengraph-image.tsx"
git commit -m "$(cat <<'EOF'
Generate a preview card per post and per role

Reuses the existing ogCard helper unchanged, so these match the five
static page cards. Jobs have no cover image column, so every role card is
generated; posts fall back to one only when they have no cover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Settle the `og:image` precedence question

**Files:**
- Possibly modify: `app/(site)/blog/[slug]/page.tsx` (only if the check below fails)

**Interfaces:** none — this task produces a decision plus evidence.

**The question:** when a post has a `cover_image_url`, `generateMetadata` sets `openGraph.images` **and** the file-convention route from Task 7 exists for the same segment. If Next emits both, crawlers may pick the wrong one. The spec explicitly refuses to assume which wins.

- [ ] **Step 1: Establish the coverless baseline**

```bash
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo \
  | grep -o 'property="og:image"' | wc -l
```

Expected: `1` — supplied by the generated card, since this post has no cover.
If `0`, the file route is not being picked up at all and Task 7 is wrong; fix that before continuing.

- [ ] **Step 2: Give the sample post a cover**

Call `mcp__supabase__execute_sql` with:

```sql
update public.posts
set cover_image_url = 'https://www.pplsolutionsinc.com/blog/ppl-blog-placeholder.png'
where slug = 'why-the-philippines-for-bpo';
```

> This is *our* sample post, not client content — but the database is shared with the live client admin, so this must be reverted in Step 5 regardless of the outcome.

- [ ] **Step 3: Count the tags again**

```bash
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo \
  | grep -o 'property="og:image"' | wc -l
curl -s http://localhost:3000/blog/why-the-philippines-for-bpo \
  | grep -o 'property="og:image" content="[^"]*"'
```

Expected: exactly `1`, and its content is the **cover URL**, not the generated card.

- [ ] **Step 4: If there were two, make the choice explicit**

Only if Step 3 returned `2`: the file convention is appending its image. Remove the ambiguity by deleting `app/(site)/blog/[slug]/opengraph-image.tsx` and resolving the image inside `generateMetadata` instead:

```tsx
  const images = [
    post.cover_image_url ?? absoluteUrl("/blog/ppl-blog-placeholder.png"),
  ];
```

That trades the generated per-post card for the shared placeholder on coverless posts — a real downgrade, so take it only if the duplicate is confirmed. Record which branch was taken in the commit message.

- [ ] **Step 5: Revert the sample post**

Call `mcp__supabase__execute_sql` with:

```sql
update public.posts set cover_image_url = null
where slug = 'why-the-philippines-for-bpo';
```

Then confirm: `select slug, cover_image_url from public.posts;` — expected `null`.

- [ ] **Step 6: Commit only if Step 4 changed something**

```bash
git status
```

If clean, nothing to commit — the evidence is the deliverable. Otherwise commit the Step 4 change.

---

### Task 9: Full gate, checklist, and end-to-end verification

**Files:**
- Modify: `PRE-LAUNCH-CHECKLIST.md` §11 (mark F1 and F2 done) and its post-cutover verification list

- [ ] **Step 1: Run the full gate**

```bash
npm test
npx tsc --noEmit; echo "TSC_EXIT=$?"
npm run build
```

Expected: tests PASS (previous count + 6 from Task 1); `TSC_EXIT=0`; build succeeds. The build is what exercises both new `opengraph-image` routes against the real database.

- [ ] **Step 2: Walk the pages once more**

- `/blog/<slug>` — share row renders, four controls, absolute non-localhost hrefs
- `/careers/<slug>` — same
- Click **Copy link** in a real browser, paste elsewhere, confirm the URL is right and the tick appears then reverts after ~2s
- Confirm the footer's two social icons still render (Task 2's extraction)

- [ ] **Step 3: Confirm share clicks are recorded**

Click each of the four controls in the browser, then call `mcp__supabase__execute_sql` with:

```sql
select label, count(*) from public.events
where label like 'share-%' group by label order by label;
```

Expected: rows for `share-copy`, `share-facebook`, `share-linkedin`, `share-x`.

> Events are batched and flushed with `sendBeacon`, so allow a few seconds or navigate away from the page before querying.

- [ ] **Step 4: Update the checklist**

In `PRE-LAUNCH-CHECKLIST.md` §11, mark **F1** and **F2** done, noting the branch. Add to the post-cutover verification list:

> Paste a live blog post URL and a live job URL into LinkedIn, Facebook and Slack and confirm the card renders with title, image and snippet. **This cannot be checked before cutover** — while `STAGING_PASSWORD` is set every crawler receives a 401.

- [ ] **Step 5: Commit**

```bash
git add PRE-LAUNCH-CHECKLIST.md
git commit -m "$(cat <<'EOF'
Mark F1 and F2 done in the pre-launch checklist

Records that the real crawler check is blocked until the staging gate
comes off, so it lands on the post-cutover list rather than being
silently skipped.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Confirm nothing is outstanding**

```bash
git status
```

Expected: clean. `.claude/settings.local.json` must not appear as staged.
