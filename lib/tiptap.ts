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
  let html = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") html = `<strong>${html}</strong>`;
    else if (mark.type === "italic") html = `<em>${html}</em>`;
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

/** Build a simple Tiptap doc from plain text (blank-line separated paragraphs). */
export function textToDoc(text: string): Json {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const content =
    paragraphs.length === 0
      ? [{ type: "paragraph" }]
      : paragraphs.map((p) => ({
          type: "paragraph",
          content: [{ type: "text", text: p }],
        }));

  return { type: "doc", content } as unknown as Json;
}

/** Flatten a Tiptap doc back to plain text (paragraphs separated by blank lines). */
export function docToText(doc: Json | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";
  const root = doc as Node;
  const blocks: string[] = [];
  const walk = (node: Node): string =>
    node.type === "text"
      ? node.text ?? ""
      : (node.content ?? []).map(walk).join("");
  for (const block of root.content ?? []) {
    blocks.push(walk(block));
  }
  return blocks.join("\n\n");
}
