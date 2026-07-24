/**
 * Section registry and visibility rule. Pure data and logic only — no DOM
 * references, because the admin server component imports the registry and
 * Vitest runs in a node environment.
 */

export type SectionDef = { key: string; label: string };

/** Section is "seen" at >=50% visible, OR after 1s of any visibility. */
export const SECTION_RATIO = 0.5;
export const SECTION_DWELL_MS = 1000;

/**
 * Without the ratio rule, a section taller than the viewport could never
 * qualify. Without the dwell rule, fast scrolling inflates every number.
 */
export function shouldFireSection(ratio: number, dwellMs: number): boolean {
  return ratio >= SECTION_RATIO || dwellMs >= SECTION_DWELL_MS;
}

/**
 * Declared, not inferred from the data: a section nobody reached produces no
 * rows at all, so only this list lets the admin panel distinguish "0% reach"
 * from "not tracked". Zero reach is the finding this feature exists to surface.
 *
 * Order here is document order and drives the admin display.
 * Keys must match the `data-track-section` attributes added in Task 7.
 */
export const SECTION_REGISTRY: Record<string, SectionDef[]> = {
  "/": [
    { key: "hero", label: "Hero" },
    { key: "industries", label: "Industry expertise" },
    { key: "threeds", label: "3Ds framework" },
    { key: "threees", label: "3E's advantage" },
    { key: "cta", label: "Closing CTA" },
  ],
  "/about": [
    { key: "hero", label: "Hero" },
    { key: "intro", label: "Intro / 100 years" },
    { key: "leadership", label: "Leadership" },
    { key: "mvv", label: "Mission, vision, values" },
    { key: "cta", label: "Closing CTA" },
  ],
  "/services": [
    { key: "hero", label: "Hero" },
    { key: "offshoring", label: "What is offshoring" },
    { key: "offices", label: "Front / back office" },
    { key: "cta", label: "Closing CTA" },
  ],
};
