import { cn } from "@/lib/cn";
import { PplText } from "./PplText";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple">
          {eyebrow}
        </span>
      )}
      <Tag
        className={cn(
          "font-bold text-ink text-balance",
          Tag === "h1"
            ? "text-4xl sm:text-5xl lg:text-6xl leading-[1.05]"
            : "text-3xl sm:text-4xl leading-tight",
        )}
      >
        <PplText>{title}</PplText>
      </Tag>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-charcoal/75 text-lg leading-relaxed",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
