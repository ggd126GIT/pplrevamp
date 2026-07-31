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
  // Newlines inside a text node would collapse to whitespace in HTML. Some
  // older job descriptions are stored as one flat paragraph with embedded
  // \n rather than structured nodes, so honour them here rather than
  // requiring every row to be re-saved.
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
