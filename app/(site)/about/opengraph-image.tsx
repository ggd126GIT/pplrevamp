import { ogCard, OG_SIZE } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Outstanding solutions delivered by amazing people";

export default function Image() {
  return ogCard({ eyebrow: "About Us", title: "Outstanding solutions delivered by amazing people", photo: "about.jpg" });
}
