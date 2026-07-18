import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/about",
    "/services",
    "/careers",
    "/blog",
    "/resources/how-to-get-started",
    "/resources/faq",
    "/resources/referral",
    "/contact",
    "/privacy-policy",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));

  const supabase = createPublicClient();
  const [{ data: posts }, { data: jobs }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("status", "published"),
    supabase.from("jobs").select("slug, updated_at").eq("status", "open"),
  ]);

  const postEntries: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const jobEntries: MetadataRoute.Sitemap = (jobs ?? []).map((j) => ({
    url: `${BASE}/careers/${j.slug}`,
    lastModified: j.updated_at ? new Date(j.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries, ...jobEntries];
}
