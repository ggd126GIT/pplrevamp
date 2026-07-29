import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { Pagination } from "@/components/admin/Pagination";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Jobs", value: "job" },
] as const;

/** Only "post" and "job" are real filters; anything else shows everything. */
function parseType(raw: string | undefined): "all" | "post" | "job" {
  return raw === "post" || raw === "job" ? raw : "all";
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const type = parseType(params.type);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from("activity")
    .select("id, actor_label, action, entity_type, entity_title, created_at", {
      count: "exact",
    });

  if (type !== "all") query = query.eq("entity_type", type);

  const { data: rows, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const basePath =
    type === "all" ? "/admin/activity" : `/admin/activity?type=${type}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Activity</h1>
      <p className="mt-1 text-charcoal/60">
        Who created, edited, published, and deleted content.
      </p>

      <div className="mt-6 flex gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "all"
                ? "/admin/activity"
                : `/admin/activity?type=${filter.value}`
            }
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              type === filter.value
                ? "bg-purple text-white"
                : "border border-black/10 bg-white text-charcoal/70 hover:bg-mist",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <ActivityFeed rows={rows ?? []} />
      </div>

      <Pagination
        page={page}
        pageCount={pageCount(count)}
        basePath={basePath}
      />
    </div>
  );
}
