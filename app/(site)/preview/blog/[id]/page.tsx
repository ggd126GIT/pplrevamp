import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blog/PostDetail";
import { PreviewBanner } from "@/components/admin/PreviewBanner";
import { createClient } from "@/lib/supabase/server";

/** A preview must read the database now — never a cached or prerendered copy. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  // See the note in preview/jobs/[id]/page.tsx — this check, not the middleware,
  // is what keeps drafts private.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { id } = await params;
  // No status filter; "posts auth read all" grants staff every row.
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  return (
    <>
      <PreviewBanner
        status={post.status}
        label={post.title}
        editHref={`/admin/posts/${post.id}`}
      />
      <PostDetail post={post} includeSchema={false} />
    </>
  );
}
