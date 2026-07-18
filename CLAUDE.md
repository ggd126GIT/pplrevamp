# .ppl Solutions, Inc. — Website Revamp Specification
**Project:** WordPress → full custom code | **Deadline:** 2 days | **Deploy target:** VPS (PM2 + Nginx)
**Source content:** `Website_Content_Consolidated_v4_2.docx` (use the "FINAL EDIT" and "SUGGESTED EDITS" columns as the copy source of truth)

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + TypeScript** | Continues your existing migration work; SSG/ISR for marketing pages, server components for CMS data |
| Styling | **Tailwind CSS** | Fast, consistent with prior work |
| Animations | **GSAP + ScrollTrigger** (section reveals, pinned 3Ds sequence) + CSS for micro-interactions | You already know the patterns (marquee, ScrollTrigger, 3D tilt) |
| Icons | **Lucide React** | Clean line iconography for Industry Expertise + services grids |
| Database + Auth + Storage | **Supabase** (hosted Postgres, Supabase Auth, Storage buckets) | Fastest path to staff login + blog/job CRUD + CV/image uploads in 2 days; you already use it (Expense Tracker, Supabase MCP). No DB admin on the VPS. |
| ORM/data access | **supabase-js** with generated types (`supabase gen types typescript`) | Skip Prisma to save setup time |
| Rich text editor | **Tiptap** (admin blog editor) | Lightweight, outputs JSON/HTML |
| Transactional email | **Resend** (already planned) | Contact form, discovery form, job application notifications |
| Deployment | **VPS: Node 20, PM2, Nginx reverse proxy, Certbot SSL** | Matches your stated infra |

**Alternative** (only if the client insists everything lives on the VPS): self-hosted Postgres + Auth.js + local uploads dir. Adds ~half a day of setup — not recommended for the 2-day window.

---

## 2. Site Map

**Public**
- `/` Home — hero, Industry Expertise icon strip, 3Ds framework, 3E's advantage, FAQ teaser, CTA band
- `/about` — main message, Mission / Vision / Values, leadership (Joey Lianko, Tina Loneza)
- `/services` — what is offshoring/outsourcing, front-office services, back-office services, industries list
- `/careers` — dynamic **jobs listing** from DB + `/careers/[slug]` job detail with application form (CV upload)
- `/blog` — NEW. Listing + `/blog/[slug]` post pages (ISR, revalidate on publish)
- `/resources/how-to-get-started` — Discover (Assess / Calibrate / Establish Baseline), Design, Deliver
- `/resources/faq` — 6 FAQs, accordion
- `/resources/referral` — 3-step referral program (Register / Refer / Reap)
- `/contact` — contact form + automated response email
- `/privacy-policy`

**Auth-gated (staff)**
- `/login` — Supabase Auth (email + password), middleware-protected
- `/admin` — dashboard
- `/admin/posts` — blog CRUD (Tiptap editor, cover image upload, draft/publish, slug auto-gen)
- `/admin/jobs` — job listing CRUD (open/closed status)
- `/admin/applications` — view job applications, download CVs
- `/admin/inquiries` — view contact/discovery form submissions

---

## 3. Database Schema (Supabase / Postgres)

```sql
-- Staff profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content jsonb,                -- Tiptap JSON
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references profiles(id),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  department text,
  location text,
  work_mode text check (work_mode in ('onsite','wfh','hybrid')),
  description jsonb,            -- Tiptap JSON
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  cv_url text not null,         -- Supabase Storage path
  created_at timestamptz default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact','discovery','referral')),
  payload jsonb not null,       -- full form body (discovery form has many conditional fields)
  created_at timestamptz default now()
);
```

**Storage buckets:** `blog-images` (public read), `cvs` (private — signed URLs for admin download; accept pdf/docx/doc/jpg/png, 2 MB cap to match current site).

**RLS policy summary:** public `select` on published posts and open jobs; `insert` on applications/inquiries open to anon via server route (service key on server only); all writes to posts/jobs restricted to authenticated profiles; applications/inquiries readable by authenticated staff only.

---

## 4. Design Proposal

**Brand tokens (keep — extracted from current site):**
- Purple `#9352A1` (accents, active states), gradient purple→orange `#A945CC → #FD9224` (primary CTA buttons)
- Gold `#FFC82B` / `#FFCA2B` (".ppl" lockup in headings, highlights) with the hero glow treatment (`text-shadow` yellow/pink layers)
- Charcoal `#232B31` body text, black headings; keep the ".ppl" lowercase-with-period wordmark styling everywhere
- Keep existing fonts (pull the exact family names from the live CSS during build; Elementor uses Google Fonts — replicate via `next/font`)

**Premium/motion upgrades:**
1. **Hero** — gradient mesh or subtle animated grain background, staggered headline reveal (GSAP `SplitText`-style word stagger), glowing ".ppl" retained, magnetic-hover CTA with gradient border
2. **Industry Expertise strip** (new, per doc) — 6 Lucide icons (Financial Markets, Consumer & Retail, Manufacturing, Energy, Healthcare, Technology) in an infinite marquee (your marquee pattern)
3. **3Ds section** — ScrollTrigger pinned section: Discover → Design → Deliver steps animate in sequence with a progress line
4. **3E's cards** — 3D tilt on hover (your tilt pattern), icon + gradient top border
5. **Stats/leadership** — count-up numbers ("60+ years combined experience"), leadership cards with reveal-on-scroll
6. **FAQ** — smooth height-animated accordion, purple active state (matches current)
7. **Global** — scroll-reveal (fade+rise, `once: true`), section headings with the gold ".ppl" lockup, generous whitespace, sticky glassmorphism header that shrinks on scroll, custom 404
8. **Blog/Careers cards** — hover lift + image zoom, skeleton loaders

Respect `prefers-reduced-motion` throughout.

---

## 5. Forms & Email (Resend)

| Form | Route handler | Emails |
|---|---|---|
| Contact | `POST /api/contact` | Auto-reply: "Thank you for contacting us. One of our .ppl will get back to you regarding your inquiry." + internal notification |
| Discovery form (multi-step, conditional fields per current site) | `POST /api/discovery` | Internal notification; store payload in `inquiries` |
| Job application | `POST /api/apply` (multipart, CV → Storage) | Internal notification + applicant confirmation |
| Referral registration | `POST /api/referral` | Internal notification |

Add honeypot + basic rate limiting on all public POST routes.

---

## 6. Two-Day Build Plan

**Day 1 — Foundation + Public Site**
1. `create-next-app` (TS, Tailwind, App Router), repo init, env setup
2. Supabase project: run schema SQL, RLS policies, storage buckets, seed one admin user + 2 sample jobs + 1 sample post
3. Design system: Tailwind theme (brand colors, fonts via `next/font`), shared UI (Button w/ gradient, SectionHeading w/ gold ".ppl" lockup, Container, Card)
4. Layout: header (sticky, mobile menu), footer (LinkedIn/Facebook links, quick links)
5. Build all static pages from the docx FINAL EDIT copy: Home, About, Services, How to Get Started, FAQ, Referral, Contact, Privacy
6. GSAP setup + reveal/marquee/pinned-3Ds/tilt animations
7. Contact + discovery forms wired to Resend + `inquiries`

**Day 2 — CMS, Careers, Blog, Deploy**
1. Supabase Auth: `/login`, middleware protecting `/admin/*`
2. Admin: posts CRUD (Tiptap + image upload), jobs CRUD, applications & inquiries viewers
3. Public `/blog` + `/blog/[slug]` (ISR + `revalidatePath` on publish), `/careers` + `/careers/[slug]` + application form with CV upload
4. SEO: metadata per page, OG images, `sitemap.ts`, `robots.ts`, redirects from old WP URLs (`/about-us/` → `/about`, `/faq/` → `/resources/faq`, etc.)
5. QA: mobile responsiveness, Lighthouse pass, reduced-motion check, form E2E tests
6. **Deploy:** VPS — clone repo, `npm run build`, PM2 (`pm2 start npm --name ppl -- start`), Nginx server block (proxy :3000, gzip, cache headers for `_next/static`), Certbot SSL, point DNS. Keep WP live until DNS cutover; export any WP content needed first.

**Deferred (post-launch, honest scoping):** blog categories/tags, search, multi-language, analytics dashboard, careers email alerts.

---

## 7. Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
RESEND_API_KEY=
CONTACT_NOTIFY_EMAIL=
NEXT_PUBLIC_SITE_URL=https://www.pplsolutionsinc.com
```

---

## 8. Content Mapping (docx → pages)

| Docx section | Page | Notes |
|---|---|---|
| HOME Main Message (Suggested Edit) | `/` hero | "Power your business strategies with .ppl…" + add Industry Expertise icon section per the note |
| How to Get Started (Final Edit short versions) | `/` 3Ds cards | Long versions go to `/resources/how-to-get-started` |
| 3E's (Final Edit short versions) | `/` advantage section | |
| ABOUT Main Message (Suggested Edit), Joey, Tina, Mission/Vision/Values | `/about` | |
| SERVICES columns (Final Edit) | `/services` | Front-office + back-office breakdowns with icons per service |
| FAQ 1–6 (Final Edit) | `/resources/faq` | |
| Referral Program 3-step (Final Edit) | `/resources/referral` | Conditions text included; "being checked by lawyer" — confirm before launch |
| Contact fields + auto-reply | `/contact` | |
