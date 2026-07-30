import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Full-bleed overlay geometry. Satori ignores the `inset` shorthand — an overlay
 * declared with `inset: 0` collapses to zero size and its gradient never paints —
 * so every stacked layer needs explicit offsets and dimensions.
 */
const LAYER = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: OG_SIZE.width,
  height: OG_SIZE.height,
};

/**
 * Shared social card: the page's own photo, darkened under the same purple/orange
 * gradient the site uses, with the gold ".ppl" lockup.
 *
 * The photo is inlined as a base64 JPEG rather than fetched over HTTP — Satori
 * cannot resolve a relative URL, and an absolute one would need the deployment
 * origin at build time. JPEG rather than webp because Satori's webp decoding is
 * unreliable. Sources come from `public/og/`, written by scripts/optimize-images.mjs.
 */
export async function ogCard({
  eyebrow,
  title,
  photo,
}: {
  eyebrow: string;
  /** Rendered as-is; wrap the ".ppl" lockup by passing it via `title` split. */
  title: string;
  /** Filename inside `public/og/`, e.g. "about.jpg". */
  photo: string;
}) {
  const file = await readFile(path.join(process.cwd(), "public", "og", photo));
  const src = `data:image/jpeg;base64,${file.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#14181c",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori has no next/image */}
        <img
          src={src}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ ...LAYER, objectFit: "cover", opacity: 0.55 }}
        />
        {/* Left-heavy scrim so the headline stays legible over a bright photo. */}
        <div
          style={{
            ...LAYER,
            background: "linear-gradient(90deg, #14181c 0%, #14181c 42%, transparent 100%)",
            opacity: 0.92,
          }}
        />
        <div
          style={{
            ...LAYER,
            opacity: 0.75,
            background:
              "radial-gradient(60% 55% at 12% 5%, #9352a1 0%, transparent 60%), radial-gradient(55% 60% at 92% 95%, #fd9224 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            color: "white",
          }}
        >
          <div
            style={{
              fontSize: 30,
              letterSpacing: 6,
              color: "#ffc82b",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              marginTop: 24,
              lineHeight: 1.05,
              maxWidth: 820,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 40, color: "rgba(255,255,255,0.75)" }}>
            <span style={{ color: "#ffc82b", fontWeight: 700 }}>.ppl</span>
            <span>&nbsp;Solutions, Inc.</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
