import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import { PostForm } from "@/components/admin/PostForm";
import { createClient } from "@/lib/supabase/server";
import { updatePost, deletePost } from "../actions";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const boundUpdate = updatePost.bind(null, id);

  return (
    <div>
      <Link
        href="/admin/posts"
        className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-purple"
      >
        <ArrowLeft className="size-4" /> Back to posts
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Edit post</h1>
        <div className="flex items-center gap-2">
          {post.status === "published" && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-charcoal/70 hover:bg-mist"
            >
              <ExternalLink className="size-4" /> View
            </Link>
          )}
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <PostForm
          action={boundUpdate}
          submitLabel="Save changes"
          values={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            cover_image_url: post.cover_image_url,
            status: post.status,
            content: post.content,
          }}
        />
      </div>
    </div>
  );
}
