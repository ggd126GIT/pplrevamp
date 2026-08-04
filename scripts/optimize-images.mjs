/**
 * Builds every image in `public/` from the originals in `assets/`.
 *
 * Re-runnable: it always regenerates from `assets/`, so `public/` is a derived
 * artefact. If a banner crop cuts off someone's head, adjust `position` here and
 * re-run rather than hand-editing anything in `public/`.
 *
 *   node scripts/optimize-images.mjs [--check]
 *
 * `--check` reports what would be written, and its byte totals, without writing.
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "assets");
const OUT = path.join(ROOT, "public");
const CHECK = process.argv.includes("--check");

/**
 * Crop presets. Banners sit behind a gradient scrim at 40% opacity, so they
 * tolerate a lower quality than the content images the eye actually lands on.
 */
const PRESET = {
  banner: { width: 1600, height: 750, quality: 80 },
  circle: { width: 600, height: 600, quality: 82 },
  square: { width: 900, height: 900, quality: 82 },
  card: { width: 1200, height: 800, quality: 80 },
  // Industry photos render as circles in a 450x450 box (IndustriesReveal), so
  // they are pre-cropped square at 900 to cover DPR 2. Previously they were
  // shipped as 1600-wide landscapes and left for the browser to centre-crop,
  // which decapitated the healthcare clinician and centred the IT shot on an
  // office chair.
  industry: { width: 900, height: 900, quality: 82 },
};

/**
 * Social-card backgrounds, written as JPEG rather than webp: the OG routes
 * inline these through Satori (`next/og`), whose webp support is unreliable.
 * Dimensions match the 1200x630 card.
 */
const OG = { width: 1200, height: 630, quality: 72 };

/**
 * `position` steers the crop. Sharp's default is centre, which decapitates
 * people in wide banner crops taken from 3:2 originals — most of these lean
 * "top" so faces survive.
 */
const MANIFEST = [
  // ---- Banners (decorative, rendered with alt="" behind a scrim) ----
  {
    src: "Young Asian Business People Meeting and Planning Business Strate.webp",
    out: "home/ppl-hero-business-strategy-planning.webp",
    preset: "banner",
    position: "top",
  },
  {
    src: "Business Meeting Asian Professionals Teamwork Collaboration Corp.webp",
    out: "about/ppl-about-hero-boardroom-meeting.webp",
    preset: "banner",
    position: "centre",
    og: "og/about.jpg",
  },
  {
    src: "Asian woman in headset providing customer service with a friendly gesture.webp",
    out: "services/ppl-services-hero-customer-service.webp",
    preset: "banner",
    position: "top",
    og: "og/services.jpg",
  },
  {
    src: "Portrait of Happy Employees.webp",
    out: "careers/ppl-careers-hero-team-portrait.webp",
    preset: "banner",
    position: "top",
    og: "og/careers.jpg",
  },
  {
    src: "Team Working in Modern Office.webp",
    out: "blog/ppl-blog-hero-team-overhead.webp",
    preset: "banner",
    position: "centre",
    og: "og/blog.jpg",
  },
  {
    src: "Photo of a Man Presenting at a Meeting.webp",
    out: "resources/ppl-resources-hero-presentation.webp",
    preset: "banner",
    position: "centre",
  },
  {
    src: "Group of People with Clenched Fists Showing Support.webp",
    out: "resources/ppl-referral-hero-fist-bump.webp",
    preset: "banner",
    position: "centre",
  },
  {
    src: "Asian Business woman Meeting Design Ideas professional investor.webp",
    out: "contact/ppl-contact-hero-consultation.webp",
    preset: "banner",
    position: "top",
    og: "og/contact.jpg",
  },
  {
    src: "corporate_people_hands_on_top_of_eachother.webp",
    out: "home/ppl-cta-team-huddle.webp",
    preset: "banner",
    position: "centre",
  },

  // ---- 3E's circular masks (real alt text; see lib/content.ts) ----
  {
    src: "Excited Business Team Celebrating Success With Laptop In Modern Office.webp",
    out: "home/ppl-3es-economical-celebration.webp",
    preset: "circle",
    position: "top",
  },
  {
    src: "Business team Asian meeting in office.webp",
    out: "home/ppl-3es-efficient-team-review.webp",
    preset: "circle",
    position: "centre",
  },
  {
    src: "Happy Young Businesspeople Celebrating Success.webp",
    out: "home/ppl-3es-evolving-whiteboard.webp",
    preset: "circle",
    position: "centre",
  },

  // ---- Other content images ----
  {
    src: "Business asian Multicultural businesspeople working project  wor.webp",
    out: "about/ppl-about-team-project-planning.webp",
    preset: "square",
    position: "centre",
  },
  {
    src: "Business Meeting Asian Professionals Teamwork Collaboration.webp",
    out: "blog/ppl-blog-placeholder-meeting.webp",
    preset: "card",
    position: "centre",
  },

  // ---- Industries: kept because the new stock set has no industry-specific
  // shots. Their alt text in lib/content.ts names the actual industry, so
  // swapping in generic meeting photos would make that alt text untrue.
  //
  // `position` is per-photo because the subjects are not centred. A centre crop
  // cut the healthcare clinician's head off and framed the IT photo on the back
  // of an office chair — verified by rendering the circles, not assumed.
  {
    src: "it-software-developers-coding.jpg",
    out: "services/ppl-it-software-developers-coding.webp",
    preset: "industry",
    position: "left", // both developers and their code; centre lands on a chair
  },
  {
    src: "telecommunications-network-testing.jpg",
    out: "services/ppl-telecommunications-network-testing.webp",
    preset: "industry",
    position: "centre",
  },
  {
    src: "ecommerce-online-checkout.png",
    out: "services/ppl-ecommerce-online-checkout.webp",
    preset: "industry",
    position: "centre",
  },
  {
    src: "healthcare-reviewing-ct-scans.jpg",
    out: "services/ppl-healthcare-reviewing-ct-scans.webp",
    preset: "industry",
    // Source is 1920x1280, so a square crop can slide 640px horizontally. The
    // scans sit far left and the clinician far right; no fixed anchor holds both.
    // `centre` (left: 320) puts the face exactly on the circle's clipped edge,
    // which is what read as decapitated. 416 keeps the scans, the pointing arm,
    // and the masked face all inside the circle.
    crop: { left: 416, top: 0, width: 1280, height: 1280 },
  },
  {
    src: "banking-customer-at-atm.jpg",
    out: "services/ppl-banking-customer-at-atm.webp",
    preset: "industry",
    position: "centre",
  },
  {
    src: "manufacturing-machine-operator.jpg",
    out: "services/ppl-manufacturing-machine-operator.webp",
    preset: "industry",
    position: "centre",
  },

  // The privacy policy reused the IT photo as its banner. Now that the industry
  // version is a 900x900 square, it needs its own wide crop from the same source.
  {
    src: "it-software-developers-coding.jpg",
    out: "privacy/ppl-privacy-hero-software-team.webp",
    preset: "banner",
    position: "centre",
  },

  // ---- Leadership portraits (supplied 2026-07-30, correctly named at last).
  //
  // Copied through rather than re-encoded. They arrive as 533x800 transparent
  // webp at 65-85 KB, and the largest slot in the fan renders at 394 CSS px —
  // 788 device px at DPR 2 — so 800 tall is already the right size. Running them
  // through sharp again would only add a second lossy webp generation.
  //
  // NEVER flatten these: LeadershipShowcase renders them with
  // `object-contain object-bottom` and depends on the transparent cutout. They
  // are 2:3 portraits, so they must not be cropped square either.
  { src: "Joey Lianko.webp", out: "team/joey-lianko.webp", copy: true },
  { src: "Tina Loneza.webp", out: "team/tina-loneza.webp", copy: true },
  { src: "Apol Macaroyo.webp", out: "team/apol-macaroyo.webp", copy: true },
  { src: "Rafael Dayalo.webp", out: "team/rafael-dayalo.webp", copy: true },
  { src: "Clari Porras.webp", out: "team/clari-porras.webp", copy: true },

  // Logo is now a vector source, rendered to PNG at 2x the 133x63 CSS box so
  // the header mark stays crisp on retina. Output stays PNG rather than webp:
  // it is a few KB with alpha either way, and the OG card and the Organization
  // /JobPosting schemas all point at ppl-logo.png by name.
  { src: "ppl-logo.svg", out: "ppl-logo.png", svg: { width: 266, height: 126 } },
];

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function build(entry) {
  const from = path.join(SRC, entry.src);
  const to = path.join(OUT, entry.out);
  const before = await sizeOf(from);

  await mkdir(path.dirname(to), { recursive: true });

  let bytes;
  if (entry.copy) {
    bytes = await readFile(from);
  } else if (entry.svg) {
    // Vector source. `density` drives the rasteriser, not the output size, so
    // it must be high enough that the render is sharper than the target box —
    // otherwise sharp rasterises small and upscales, defeating the point.
    bytes = await sharp(from, { density: entry.svg.density ?? 1200 })
      .resize(entry.svg.width, entry.svg.height)
      .png({ compressionLevel: 9 })
      .toBuffer();
  } else {
    const { width, height, quality } = PRESET[entry.preset];
    let pipeline = sharp(from);
    // `crop` takes a precise source region when no fixed anchor frames the shot
    // well — see the healthcare entry. Pixel values are tied to that source's
    // dimensions, so re-check them if the source is ever replaced.
    if (entry.crop) pipeline = pipeline.extract(entry.crop);
    // Alpha is preserved automatically; the portrait cutouts rely on it.
    bytes = await pipeline
      .resize({
        width,
        height: height ?? undefined,
        fit: height ? "cover" : "inside",
        position: entry.position ?? "centre",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 6 })
      .toBuffer();
  }

  if (!CHECK) await writeFile(to, bytes);

  const extra = [];
  if (entry.og) {
    const ogTo = path.join(OUT, entry.og);
    await mkdir(path.dirname(ogTo), { recursive: true });
    const ogBytes = await sharp(from)
      .resize({ width: OG.width, height: OG.height, fit: "cover", position: entry.position ?? "centre" })
      .jpeg({ quality: OG.quality, mozjpeg: true })
      .toBuffer();
    if (!CHECK) await writeFile(ogTo, ogBytes);
    extra.push({ out: entry.og, before: 0, after: ogBytes.length });
  }

  return [{ out: entry.out, before, after: bytes.length }, ...extra];
}

const results = [];
for (const entry of MANIFEST) {
  try {
    results.push(...(await build(entry)));
  } catch (err) {
    console.error(`FAILED  ${entry.src} -> ${entry.out}\n        ${err.message}`);
    process.exitCode = 1;
  }
}

let totalBefore = 0;
let totalAfter = 0;
for (const r of results) {
  totalBefore += r.before;
  totalAfter += r.after;
  console.log(`${kb(r.before).padStart(8)} -> ${kb(r.after).padStart(8)}   ${r.out}`);
}

console.log(
  `\n${results.length} files from ${MANIFEST.length} sources${CHECK ? " (dry run)" : ""}` +
    `\nsources ${kb(totalBefore)} -> output ${kb(totalAfter)}` +
    ` (${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}% smaller)`,
);
