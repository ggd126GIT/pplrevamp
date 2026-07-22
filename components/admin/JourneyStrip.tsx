import { ArrowRight } from "lucide-react";
import type { JourneyStep } from "@/lib/analytics/queries";

export function JourneyStrip({ steps }: { steps: JourneyStep[] }) {
  if (!steps.length) return null;

  const arrivedFrom = steps[0].source ?? "direct";

  return (
    <details className="mt-4 border-t border-black/[0.06] pt-3">
      <summary className="cursor-pointer text-xs font-medium text-purple">
        Journey · {steps.length} page{steps.length === 1 ? "" : "s"} · via{" "}
        {arrivedFrom}
      </summary>
      <ol className="mt-3 space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <ArrowRight className="size-3 shrink-0 text-charcoal/30" />
            <span className="text-ink">{step.path}</span>
            <time className="text-charcoal/40">
              {new Date(step.created_at).toLocaleTimeString()}
            </time>
          </li>
        ))}
      </ol>
    </details>
  );
}
