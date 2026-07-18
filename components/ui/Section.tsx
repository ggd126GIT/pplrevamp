import { cn } from "@/lib/cn";

export function Section({
  children,
  className,
  id,
  bg = "white",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: "white" | "cream" | "mist" | "ink";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28",
        bg === "white" && "bg-white",
        bg === "cream" && "bg-cream",
        bg === "mist" && "bg-mist",
        bg === "ink" && "bg-ink text-white",
        className,
      )}
    >
      {children}
    </section>
  );
}
