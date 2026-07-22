"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Briefcase,
  Inbox,
  Mails,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Posts", href: "/admin/posts", icon: FileText },
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { label: "Applications", href: "/admin/applications", icon: Inbox },
  { label: "Inquiries", href: "/admin/inquiries", icon: Mails },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-purple text-white"
                : "text-charcoal/70 hover:bg-mist hover:text-purple",
            )}
          >
            <Icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
