# Preview unpublished jobs and posts

**Date:** 2026-08-06
**Status:** approved

## Why

There is no way to see a job or post as it will actually appear before it goes
live. `app/(site)/careers/[slug]/page.tsx` filters `.eq("status","open")` and
`app/(site)/blog/[slug]/page.tsx` filters `.eq("status","published")`, so a closed
job and a draft post both `notFound()` at their public URLs. The only way to
proofread the real rendering — hero, meta row, posted date, typography, apply form
— is to publish it, which is exactly what an editor checking for typos is trying
to avoid.

The admin edit form shows the Tiptap body, but that is the editor's rendering, not
the page's.

## Scope

Jobs **and** blog posts. The plumbing — auth guard, route group, banner, extracted
render components — is written once and serves both, and drafts have the identical
problem.

## Design

### Routes

```
app/(site)/preview/jobs/[id]/page.tsx
app/(site)/preview/blog/[id]/page.tsx
```

Inside the `(site)` route group, so they inherit the real header, footer and fonts.
Keyed by **id, not slug**: a draft may carry a placeholder slug, and an id URL does
not imply it is the future public address.

`export const dynamic = "force-dynamic"` on both — a preview must read the database
at request time and must never be served from a cached or statically generated
render.

### Authentication — two independent guards

**1. In the page (the real guard).** Each preview page calls
`supabase.auth.getUser()` before fetching anything; no user → `notFound()`.

**2. In middleware (convenience).** `/preview` is added to the `updateSession`
branch in `proxy.ts` and to the redirect in `lib/supabase/middleware.ts`, so a
signed-out editor is bounced to `/login?next=…` rather than hitting a bare 404.

The redundancy is deliberate. The existing guard is a **path-prefix string check on
`/admin`, in two separate files**. A preview route outside `/admin` depends on both
being edited correctly, and a mistake in either would publish every draft post and
unposted job at a guessable URL. The in-page check makes such a mistake a
non-event.

`notFound()` rather than a 401 so the route does not advertise its own existence.

### Robots

`/preview/*` responses carry `x-robots-tag: noindex, nofollow` **unconditionally**.
Today that header is only set when `STAGING_PASSWORD` is present, which is no
longer true in production. `robots.txt` also disallows `/preview/`. Both are
belt-and-braces behind the auth guard, which already makes the pages unreadable by
a crawler.

### Shared rendering — what makes it a real preview

Extract each public page's body into a component that takes the row:

| New component | Extracted from |
|---|---|
| `components/careers/JobDetail.tsx` | `app/(site)/careers/[slug]/page.tsx` |
| `components/blog/PostDetail.tsx` | `app/(site)/blog/[slug]/page.tsx` |

The public page fetches **with** its status filter. The preview page fetches by id
**without** one, relying on the existing `jobs auth read all` and
`posts auth read all` RLS policies — so there is no database or policy work.

Both then render the same component. This is the point of the feature: the moment
preview and production render through different code, the preview starts lying,
which is the usual way preview features fail.

### Banner and entry point

`components/admin/PreviewBanner.tsx` — a fixed bar stating "Preview — not live",
the item's real status (draft / closed / expired), and a link back to the edit
form. Rendered by the preview pages only, outside the shared detail component so it
can never leak into the public page.

A **"Preview saved version"** button on `/admin/jobs/[id]` and `/admin/posts/[id]`,
opening in a new tab so unsaved work is not lost.

### Known limitation, stated in the UI

This previews **saved** state, not what is currently typed into the form. The flow
is Save → Preview. Live preview of the unsaved editor buffer is substantially
larger work and is not in scope; the button label says "saved version" so nobody
expects otherwise.

## Out of scope

- **Shareable preview links for the client** (non-staff). That needs signed,
  expiring tokens and is a separate feature.
- **Live preview of unsaved form state.**
- The parked post **approval flow** — unchanged by this.

## Verification

Vitest here runs `environment: "node"` and collects only `**/*.test.ts`, so pages
are not unit-testable in this setup. The auth guard is the thing that must be
proven, so verification is live:

1. **Signed-out request to a preview URL does not render** — the critical check,
   run with curl so no session cookie is present.
2. Signed-in staff: a **draft post** and a **closed job** both render.
3. Those same items still **404 on their public URLs** — no regression.
4. `x-robots-tag: noindex, nofollow` present on a preview response.
5. A published job and post render identically on their public URL before and after
   the component extraction.

Plus `tsc --noEmit`, the full suite as a regression check, and `npm run build`.
