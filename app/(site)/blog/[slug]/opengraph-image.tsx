import { ogCard, OG_SIZE } from "@/lib/og-card";
import { createPublicClient } from "@/lib/supabase/public";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Article on the .ppl Solutions blog";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("posts")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return ogCard({
    eyebrow: "Insights",
    title: data?.title ?? "Perspectives on offshoring, outsourcing, and BPO",
    photo: "blog.jpg",
  });
}
