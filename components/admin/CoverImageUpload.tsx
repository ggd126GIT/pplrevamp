"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

export function CoverImageUpload({
  name,
  defaultUrl,
}: {
  name: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("blog-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />
      {url ? (
        <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-black/10">
          <Image
            src={url}
            alt="Cover preview"
            width={640}
            height={360}
            className="h-48 w-full object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Remove image"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 bg-white px-6 py-10 text-center text-sm text-charcoal/60 hover:border-purple hover:text-purple">
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <ImagePlus className="size-6" />
              Click to upload a cover image
              <span className="text-xs text-charcoal/40">PNG or JPG, up to 5 MB</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
