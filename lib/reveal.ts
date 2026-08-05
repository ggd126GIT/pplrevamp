/**
 * Scroll-reveal decisions. Pure string work, kept out of the component because
 * vitest runs `environment: "node"` and only collects `**\/*.test.ts` — logic
 * in a `.tsx` file cannot be tested at all.
 *
 * Background: `.reveal` starts at `opacity: 0` and only an IntersectionObserver
 * ever clears it. When the observer does not fire — JS blocked or slow, a
 * bfcache restore, a zero-height parent, a browser quirk — the content is not
 * merely unanimated, it is invisible *permanently*. These helpers back the
 * timeout that guarantees a second path to visible.
 */

/**
 * How long content may stay hidden waiting to be scrolled to.
 *
 * Deliberately generous. A visitor scrolling at any normal pace reaches the
 * second viewport well inside 2s and sees the intended animation, so this only
 * wins when something is actually wrong. Shortening it would start pre-empting
 * the design; lengthening it leaves a blank page on screen too long.
 */
export const REVEAL_TIMEOUT_MS = 2000;

/**
 * Classes for a reveal element. `forced` means the timeout rescued it rather
 * than the observer firing, so it appears instantly — fading in content the
 * visitor never scrolled to draws the eye to a glitch.
 */
export function revealClassName(visible: boolean, forced: boolean): string {
  if (!visible) return "reveal";
  return forced ? "reveal is-visible reveal-instant" : "reveal is-visible";
}

/**
 * Stagger delay, dropped on a forced reveal: staggering a rescue makes the
 * failure look slower than it is — the last card of a six-item grid would
 * arrive half a second after the timeout had already fired.
 */
export function revealDelay(delay: number, forced: boolean): number {
  return forced ? 0 : delay;
}
