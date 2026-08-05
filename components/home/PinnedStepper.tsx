"use client";

/**
 * The `01 / 02 / 03` row above a pinned sequence, shared by the 3Ds and 3Es
 * sections — identical markup in both, and one place for the accessibility.
 *
 * These were `<div>`s: not focusable, not announced, no keyboard path. Making
 * them do something means making them real controls, so they are `<button>`s —
 * Enter and Space come free, and `aria-current="step"` tells a screen reader
 * which phase is showing.
 *
 * The `data-` hooks are load-bearing: each parent's GSAP timeline queries
 * `[data-pill-fill]`, `[data-pill-num]` and `[data-progress-fill]` off its root
 * ref to drive the colours and the progress line. Renaming them breaks the
 * animation silently.
 */
export function PinnedStepper({
  steps,
  active,
  onSelect,
  label,
}: {
  steps: { key: string }[];
  active: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  return (
    <div
      className="relative mb-12 flex max-w-md items-center justify-between"
      role="group"
      aria-label={label}
    >
      <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-black/10">
        <div
          data-progress-fill
          className="h-full origin-left bg-gradient-to-r from-grad-from to-grad-to"
        />
      </div>
      {steps.map((step, i) => (
        <button
          key={step.key}
          type="button"
          onClick={() => onSelect(i)}
          aria-current={i === active ? "step" : undefined}
          aria-label={`Go to step ${i + 1} of ${steps.length}`}
          className="relative z-10 grid size-11 cursor-pointer place-items-center rounded-full border border-black/10 bg-white outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
        >
          <span
            data-pill-fill
            aria-hidden
            className="absolute inset-0 rounded-full bg-gradient-to-br from-grad-from to-grad-to"
          />
          <span
            data-pill-num
            aria-hidden
            className="relative font-display text-sm font-bold"
          >
            0{i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
