import { describe, expect, it } from "vitest";
import { magneticOffset } from "./magnetic";

const wide = { width: 284, height: 52 }; // the real hero CTA
const small = { width: 80, height: 40 };

describe("magneticOffset", () => {
  it("does not move when the pointer is dead centre", () => {
    expect(magneticOffset(wide, { x: 142, y: 26 }, 8)).toEqual({ x: 0, y: 0 });
  });

  it("caps at maxOffset on the far edge", () => {
    expect(magneticOffset(wide, { x: 284, y: 52 }, 8)).toEqual({ x: 8, y: 8 });
    expect(magneticOffset(wide, { x: 0, y: 0 }, 8)).toEqual({ x: -8, y: -8 });
  });

  it("never exceeds maxOffset even outside the element", () => {
    const o = magneticOffset(wide, { x: 5000, y: -5000 }, 8);
    expect(o).toEqual({ x: 8, y: -8 });
  });

  // The regression this exists for: scaling raw pixel distance made a wide
  // element drift far more than a short one, so the hero CTA slid 50px across
  // and 9px down off the same gesture.
  it("moves a wide and a narrow element by the same amount at the same relative position", () => {
    const a = magneticOffset(wide, { x: wide.width, y: wide.height / 2 }, 8);
    const b = magneticOffset(small, { x: small.width, y: small.height / 2 }, 8);
    expect(a.x).toBe(b.x);
  });

  it("is symmetric between axes at the same relative position", () => {
    const o = magneticOffset(wide, { x: wide.width, y: wide.height }, 8);
    expect(Math.abs(o.x)).toBe(Math.abs(o.y));
  });

  it("scales linearly between centre and edge", () => {
    // Three quarters across is halfway from centre to the edge.
    expect(magneticOffset(wide, { x: 213, y: 26 }, 8).x).toBeCloseTo(4, 5);
  });

  // A hidden 0x0 copy of the CTA exists in the DOM for the mobile menu.
  it("returns zero for a zero-sized element instead of NaN", () => {
    const o = magneticOffset({ width: 0, height: 0 }, { x: 0, y: 0 }, 8);
    expect(o).toEqual({ x: 0, y: 0 });
    expect(Number.isNaN(o.x)).toBe(false);
  });
});
