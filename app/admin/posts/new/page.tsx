import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/components/admin/PostForm";
import { createPost } from "../actions";

export default function NewPostPage() {
  return (
    <div>
      <Link
        href="/admin/posts"
        className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-purple"
      >
        <ArrowLeft className="size-4" /> Back to posts
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink">New post</h1>
      <div className="mt-8">
        <PostForm action={createPost} submitLabel="Create post" />
      </div>
    </div>
  );
}
