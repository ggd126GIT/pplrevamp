import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

const typeStyles: Record<string, string> = {
  contact: "bg-purple/10 text-purple",
  discovery: "bg-amber-100 text-amber-700",
  referral: "bg-emerald-100 text-emerald-700",
};

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Inquiries</h1>
      <p className="mt-1 text-charcoal/60">
        Contact, discovery, and referral submissions.
      </p>

      {!inquiries?.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-black/10 p-10 text-center text-charcoal/50">
          No inquiries yet.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {inquiries.map((inq) => {
            const payload = (inq.payload ?? {}) as Record<string, unknown>;
            return (
              <div
                key={inq.id}
                className="rounded-2xl border border-black/[0.06] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      typeStyles[inq.type] ?? "bg-black/5 text-charcoal",
                    )}
                  >
                    {inq.type}
                  </span>
                  <time className="text-xs text-charcoal/50">
                    {inq.created_at
                      ? new Date(inq.created_at).toLocaleString()
                      : ""}
                  </time>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {Object.entries(payload)
                    .filter(([, v]) => v !== null && v !== "" && v !== undefined)
                    .map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <dt className="text-charcoal/50">{humanize(k)}</dt>
                        <dd className="text-ink">{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
