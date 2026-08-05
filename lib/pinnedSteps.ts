/**
 * Scroll maths for the pinned stepper sections (3Ds, 3Es).
 *
 * Both sections are scrubbed ScrollTriggers: the timeline position *is* the
 * scroll position, so a step cannot be selected by seeking the timeline without
 * fighting the scrub. Clicking a step instead scrolls the window to where that
 * phase sits, and the existing scrub plays the transition for free — one
 * animation path, and scroll position never disagrees with what is on screen.
 *
 * Pure so it can be tested: vitest runs `environment: "node"` here and collects
 * only `**\/*.test.ts`.
 */

/**
 * Scroll offset for a point in the timeline, given the trigger's measured
 * range. Clamped, because a caller reading live progress can hand us anything,
 * and guarded against `end === start` — which happens before ScrollTrigger has
 * measured, and on a viewport too short to pin.
 */
export function stepScrollTop(
  start: number,
  end: number,
  progress: number,
): number {
  const span = Math.max(0, end - start);
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(start + span * p);
}

/**
 * Which step is showing at this progress — the nearest snap point. Drives
 * `aria-current`, so it has to agree with what the visitor can see.
 *
 * Ties resolve to the earlier step: strict `<` keeps the first of two equally
 * close points rather than letting float noise pick.
 */
export function activeStep(progress: number, points: number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const distance = Math.abs(points[i] - progress);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
