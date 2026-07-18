import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label=".ppl Solutions, Inc. home"
      className={cn(
        "font-display font-extrabold tracking-tight leading-none",
        className,
      )}
    >
      <span className="ppl-lockup">.ppl</span>
      <span className={onDark ? "text-white" : "text-ink"}> Solutions</span>
    </Link>
  );
}
