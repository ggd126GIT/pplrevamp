import { notFound } from "next/navigation";
import { ogCard, OG_SIZE } from "@/lib/og-card";
import { createPublicClient } from "@/lib/supabase/public";
import { notExpiredFilter } from "@/lib/jobs";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Open role at .ppl Solutions, Inc.";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("jobs")
    .select("title, department")
    .eq("slug", slug)
    .eq("status", "open")
    .or(notExpiredFilter())
    .single();

  if (!data) notFound();

  return ogCard({
    eyebrow: data.department || "Careers",
    title: data.title,
    photo: "careers.jpg",
  });
}
