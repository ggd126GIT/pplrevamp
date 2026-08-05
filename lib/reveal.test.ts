import { describe, expect, it } from "vitest";
import { REVEAL_TIMEOUT_MS, revealClassName, revealDelay } from "./reveal";

describe("REVEAL_TIMEOUT_MS", () => {
  // Long enough that a visitor scrolling at a normal pace still sees the
  // intended animation; the timer is a floor for when something is wrong.
  it("is a backstop, not a feature", () => {
    expect(REVEAL_TIMEOUT_MS).toBe(2000);
  });
});

describe("revealClassName", () => {
  it("starts hidden", () => {
    expect(revealClassName(false, false)).toBe("reveal");
  });

  it("animates in on a normal scroll reveal", () => {
    expect(revealClassName(true, false)).toBe("reveal is-visible");
  });

  // A section force-revealed 2s after load was never scrolled to. Fading it in
  // then would draw the eye to a glitch; it should simply already be there.
  it("appears without the transition when forced", () => {
    expect(revealClassName(true, true)).toBe("reveal is-visible reveal-instant");
  });
});

describe("revealDelay", () => {
  it("keeps the stagger on a normal reveal", () => {
    expect(revealDelay(200, false)).toBe(200);
  });

  // Staggering a rescue makes the failure look slower than it is: the last
  // card in a 6-item grid would land 500ms after the timeout already fired.
  it("drops the stagger when forced", () => {
    expect(revealDelay(200, true)).toBe(0);
    expect(revealDelay(500, true)).toBe(0);
  });

  it("treats no delay as no delay either way", () => {
    expect(revealDelay(0, false)).toBe(0);
    expect(revealDelay(0, true)).toBe(0);
  });
});
