import { Fragment } from "react";
import { cn } from "@/lib/cn";

/**
 * Renders text while highlighting every ".ppl" occurrence with the gold
 * lockup styling that appears throughout the brand.
 */
export function PplText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const parts = children.split(/(\.ppl)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part === ".ppl" ? (
          <span key={i} className="ppl-lockup">
            .ppl
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
