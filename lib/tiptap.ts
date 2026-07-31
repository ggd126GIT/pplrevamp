import type { Json } from "@/lib/database.types";

/** A minimal Tiptap/ProseMirror node shape. */
type Node = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderText(node: Node): string {
  // Newlines inside a text node would collapse to whitespace in HTML. Job
  // descriptions saved before textToDoc understood single line breaks are
  // stored as one flat paragraph with embedded \n, so honour them here rather
  // than requiring every row to be re-saved.
  let html = escapeHtml(node.text ?? "").replace(/\n/g, "<br/>");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") html = `<strong>${html}</strong>`;
    else if (mark.type === "italic") html = `<em>${html}</em>`;
    else if (mark.type === "underline") html = `<u>${html}</u>`;
    else if (mark.type === "strike") html = `<s>${html}</s>`;
    else if (mark.type === "code") html = `<code>${html}</code>`;
    else if (mark.type === "link") {
      const href = escapeHtml(String(mark.attrs?.href ?? "#"));
      html = `<a href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }
  }
  return html;
}

function renderNode(node: Node): string {
  switch (node.type) {
    case "text":
      return renderText(node);
    case "hardBreak":
      return "<br/>";
    case "paragraph":
      return `<p>${renderChildren(node)}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 4);
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(node)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(node)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(node)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderChildren(node)}</code></pre>`;
    case "doc":
      return renderChildren(node);
    default:
      return renderChildren(node);
  }
}

function renderChildren(node: Node): string {
  return (node.content ?? []).map(renderNode).join("");
}

/** Render a Tiptap JSON document to sanitized HTML. */
export function renderTiptap(doc: Json | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";
  return renderNode(doc as Node);
}

/**
 * A line opening with a bullet glyph, plus the whitespace after it.
 *
 * Word and Google Docs paste bullets as a literal glyph followed by a tab, so
 * the tab has to be consumed too or every list item starts with one.
 */
const BULLET_LINE = /^[•·*\-–—]\s+/;

/** Text nodes for one paragraph, with explicit hardBreaks between lines. */
function linesToInline(lines: string[]): Node[] {
  const out: Node[] = [];
  for (const line of lines) {
    if (out.length > 0) out.push({ type: "hardBreak" });
    out.push({ type: "text", text: line });
  }
  return out;
}

/**
 * Build a Tiptap doc from the plain text of the admin textarea.
 *
 * Blank lines separate blocks, and *within* a block consecutive bullet lines
 * become a real bulletList while everything else becomes a paragraph whose
 * line breaks are hardBreaks. Splitting on blank lines alone (the original
 * behaviour) turned a pasted job spec into a single paragraph that rendered as
 * a wall of text.
 */
export function textToDoc(text: string): Json {
  const content: Node[] = [];

  for (const block of text.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let prose: string[] = [];
    let items: string[] = [];

    const flushProse = () => {
      if (prose.length === 0) return;
      content.push({ type: "paragraph", content: linesToInline(prose) });
      prose = [];
    };
    const flushList = () => {
      if (items.length === 0) return;
      content.push({
        type: "bulletList",
        content: items.map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
        })),
      });
      items = [];
    };

    for (const line of lines) {
      if (BULLET_LINE.test(line)) {
        const item = line.replace(BULLET_LINE, "").trim();
        if (!item) continue; // a lone glyph carries no content
        flushProse();
        items.push(item);
      } else {
        flushList();
        prose.push(line);
      }
    }
    flushProse();
    flushList();
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  } as unknown as Json;
}

/** Inline text of one block, turning hardBreaks back into newlines. */
function blockToText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "bulletList") {
    return (node.content ?? [])
      .map((item) => `• ${blockToText(item)}`)
      .join("\n");
  }
  return (node.content ?? []).map(blockToText).join("");
}

/**
 * Flatten a Tiptap doc back to the plain text the admin textarea edits.
 *
 * Must round-trip `textToDoc` exactly, or opening a job and pressing save
 * would quietly reshape its description. A bulletList belongs to the line
 * above it, so it joins with a single newline; other blocks are blank-line
 * separated.
 */
export function docToText(doc: Json | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";
  const root = doc as Node;
  let out = "";
  (root.content ?? []).forEach((block, i) => {
    const text = blockToText(block);
    if (i === 0) out = text;
    else out += (block.type === "bulletList" ? "\n" : "\n\n") + text;
  });
  return out;
}
