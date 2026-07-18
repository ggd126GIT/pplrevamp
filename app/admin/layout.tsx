import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive: proxy.ts already guards, but never render admin without a user.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-mist">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/[0.06] bg-white p-5 lg:flex">
        <div className="px-1.5">
          <Logo className="text-xl" />
        </div>
        <div className="mt-8 flex-1">
          <AdminNav />
        </div>
        <div className="border-t border-black/[0.06] pt-4">
          <p className="truncate px-1.5 text-xs text-charcoal/50">
            {user.email}
          </p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-charcoal/70 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-black/[0.06] bg-white px-5 py-3 lg:hidden">
          <Logo className="text-lg" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/70"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </header>
        <div className="border-b border-black/[0.06] bg-white px-3 py-2 lg:hidden">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <AdminNav />
            </div>
          </div>
        </div>
        <div className="flex-1 p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
