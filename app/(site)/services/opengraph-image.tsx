import { ogCard, OG_SIZE } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Front-office and back-office BPO, built around your business";

export default function Image() {
  return ogCard({ eyebrow: "Our Services", title: "Front-office and back-office BPO, built around your business", photo: "services.jpg" });
}
