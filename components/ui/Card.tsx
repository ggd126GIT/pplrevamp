import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  gradientTop = false,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Show the purple->orange accent bar along the top edge. */
  gradientTop?: boolean;
  /** Lift + shadow on hover. */
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-7 shadow-sm",
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10",
        className,
      )}
    >
      {gradientTop && (
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-grad-from to-grad-to" />
      )}
      {children}
    </div>
  );
}
