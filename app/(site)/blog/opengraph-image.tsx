import { ogCard, OG_SIZE } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Perspectives on offshoring, outsourcing, and BPO";

export default function Image() {
  return ogCard({ eyebrow: "Insights", title: "Perspectives on offshoring, outsourcing, and BPO", photo: "blog.jpg" });
}
