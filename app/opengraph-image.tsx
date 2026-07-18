import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = ".ppl Solutions, Inc.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(60% 55% at 15% 10%, #9352a1 0%, transparent 60%), radial-gradient(55% 60% at 90% 90%, #fd9224 0%, transparent 60%), #14181c",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, color: "#ffc82b", textTransform: "uppercase" }}>
          BPO Solutions Provider
        </div>
        <div style={{ fontSize: 82, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
          Power your business
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 82,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          <span>strategies with&nbsp;</span>
          <span style={{ color: "#ffc82b" }}>.ppl</span>
        </div>
        <div style={{ fontSize: 30, marginTop: 40, color: "rgba(255,255,255,0.75)" }}>
          .ppl Solutions, Inc.
        </div>
      </div>
    ),
    { ...size },
  );
}
