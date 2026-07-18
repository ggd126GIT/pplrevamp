import Link from "next/link";
import { FileText, Briefcase, Inbox, Mails, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function count(table: "posts" | "jobs" | "applications" | "inquiries") {
  const supabase = await createClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminDashboard() {
  const [posts, jobs, applications, inquiries] = await Promise.all([
    count("posts"),
    count("jobs"),
    count("applications"),
    count("inquiries"),
  ]);

  const cards = [
    { label: "Posts", value: posts, href: "/admin/posts", icon: FileText },
    { label: "Jobs", value: jobs, href: "/admin/jobs", icon: Briefcase },
    {
      label: "Applications",
      value: applications,
      href: "/admin/applications",
      icon: Inbox,
    },
    {
      label: "Inquiries",
      value: inquiries,
      href: "/admin/inquiries",
      icon: Mails,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-charcoal/60">Overview of your content and leads.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-2xl border border-black/[0.06] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple/10"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-purple/10 text-purple">
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-4 text-charcoal/30 transition-transform group-hover:translate-x-1 group-hover:text-purple" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold text-ink">
                {card.value}
              </p>
              <p className="text-sm text-charcoal/60">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/posts/new"
          className="rounded-full bg-gradient-to-r from-grad-from to-grad-to px-5 py-2.5 text-sm font-semibold text-white"
        >
          New post
        </Link>
        <Link
          href="/admin/jobs/new"
          className="rounded-full border border-purple/30 px-5 py-2.5 text-sm font-semibold text-purple hover:bg-purple/5"
        >
          New job
        </Link>
      </div>
    </div>
  );
}
