import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-mist px-5 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="text-2xl" />
          <h1 className="mt-6 text-2xl font-bold text-ink">Staff Login</h1>
          <p className="mt-2 text-sm text-charcoal/70">
            Sign in to manage posts, jobs, and inquiries.
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-8 shadow-sm">
          <LoginForm next={safeNext} />
        </div>

        <p className="mt-6 text-center text-sm text-charcoal/60">
          <Link href="/" className="hover:text-purple">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
