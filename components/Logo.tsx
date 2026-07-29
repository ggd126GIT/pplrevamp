import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label=".ppl Solutions, Inc. home"
      className={cn(
        // py-1 keeps the tap target above the 24px minimum at small text sizes;
        // leading-none means the anchor would otherwise be only as tall as the mark.
        "inline-flex items-center gap-2 py-1 font-display font-extrabold tracking-tight leading-none",
        className,
      )}
    >
      <Image
        src="/ppl-logo.png"
        alt=".ppl"
        width={133}
        height={63}
        priority
        className="h-[1.1em] w-auto"
      />
    </Link>
  );
}
