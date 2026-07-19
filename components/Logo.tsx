import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label=".ppl Solutions, Inc. home"
      className={cn(
        "inline-flex items-center gap-2 font-display font-extrabold tracking-tight leading-none",
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
