import { ogCard, OG_SIZE } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Let's talk about powering your business strategies";

export default function Image() {
  return ogCard({ eyebrow: "Contact Us", title: "Let's talk about powering your business strategies", photo: "contact.jpg" });
}
