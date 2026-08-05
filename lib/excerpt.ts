/**
 * Excerpt line handling. Pure string work, kept out of the components because
 * vitest runs `environment: "node"` and only collects `**\/*.test.ts` — logic
 * in a `.tsx` file cannot be tested at all.
 */

/**
 * Split a stored excerpt into the lines its author typed.
 *
 * Editors paste excerpts straight out of Word or LinkedIn, so they arrive with
 * a byline on the first line and CRLF breaks between paragraphs. Rendered as
 * plain text in a `<p>`, HTML collapses every one of those breaks to a single
 * space and the byline runs into the first sentence ("By Tina Loneza Looking
 * back, …"). Callers render these lines with `whitespace-pre-line` so the
 * breaks survive.
 *
 * Blank lines are dropped rather than preserved: the listing cards clamp the
 * excerpt to three lines, and an empty row there costs a third of the snippet.
 */
export function excerptLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
