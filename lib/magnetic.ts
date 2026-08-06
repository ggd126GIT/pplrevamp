/**
 * Magnetic-hover displacement. Pure geometry, kept out of the component so the
 * awkward cases are testable — chiefly a zero-sized element, which really does
 * occur: the homepage carries a hidden 0×0 copy of its CTA for the mobile menu,
 * and dividing by its width would yield NaN.
 */

export type Size = { width: number; height: number };

/** Pointer position relative to the element's top-left corner. */
export type Point = { x: number; y: number };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * How far to translate an element whose centre the pointer is pulling away from.
 *
 * The offset is normalised by the element's own half-size, so it is capped at
 * `maxOffset` pixels in each axis no matter how wide the element is. Scaling the
 * raw pixel distance instead — the obvious implementation — makes a wide button
 * travel proportionally further than a narrow one: the 284px hero CTA drifted
 * 50px sideways but only 9px down, which reads as sliding rather than magnetism.
 */
export function magneticOffset(
  size: Size,
  pointer: Point,
  maxOffset: number,
): { x: number; y: number } {
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  if (halfW <= 0 || halfH <= 0) return { x: 0, y: 0 };

  const relX = (pointer.x - halfW) / halfW;
  const relY = (pointer.y - halfH) / halfH;

  return {
    x: clamp(relX, -1, 1) * maxOffset,
    y: clamp(relY, -1, 1) * maxOffset,
  };
}
