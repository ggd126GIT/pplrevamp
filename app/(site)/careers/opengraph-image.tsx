import { ogCard, OG_SIZE } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "The playground of the best people";

export default function Image() {
  return ogCard({ eyebrow: "Careers", title: "The playground of the best people", photo: "careers.jpg" });
}
