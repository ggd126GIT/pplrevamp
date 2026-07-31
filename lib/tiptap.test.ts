import { describe, expect, it } from "vitest";
import { docToText, renderTiptap, textToDoc } from "./tiptap";

/**
 * The job description field is a plain textarea, so everything here is about
 * round-tripping pasted text (Word / Google Docs) through Tiptap JSON without
 * losing line structure. The original implementation split paragraphs on blank
 * lines only, which collapsed a whole bulleted job spec into one paragraph —
 * fine in the textarea (which honours \n) but a wall of text once rendered to
 * HTML, where \n is whitespace.
 */

const doc = (text: string) => textToDoc(text) as unknown as {
  content: { type: string; content?: unknown[] }[];
};

describe("textToDoc", () => {
  it("still splits blank-line separated prose into paragraphs", () => {
    const d = doc("First para.\n\nSecond para.");
    expect(d.content).toHaveLength(2);
    expect(d.content.every((n) => n.type === "paragraph")).toBe(true);
  });

  it("turns bullet lines into a real bulletList", () => {
    const d = doc("•\tRespond to inquiries.\n•\tAssist customers.");
    expect(d.content).toHaveLength(1);
    expect(d.content[0].type).toBe("bulletList");
    expect(d.content[0].content).toHaveLength(2);
  });

  it("strips the bullet glyph and its trailing tab from item text", () => {
    expect(docToText(textToDoc("•\tRespond to inquiries."))).toBe(
      "• Respond to inquiries.",
    );
  });

  it("recognises -, *, – and · as bullets too", () => {
    for (const glyph of ["-", "*", "–", "·"]) {
      const d = doc(`${glyph} one\n${glyph} two`);
      expect(d.content[0].type, `glyph ${glyph}`).toBe("bulletList");
    }
  });

  it("keeps a lead-in line as its own paragraph before the list", () => {
    const d = doc("Key Responsibilities\n•\tOne.\n•\tTwo.");
    expect(d.content.map((n) => n.type)).toEqual(["paragraph", "bulletList"]);
  });

  it("handles several list blocks separated by headings", () => {
    const d = doc("Required\n• A\n• B\n\nPreferred\n• C");
    expect(d.content.map((n) => n.type)).toEqual([
      "paragraph",
      "bulletList",
      "paragraph",
      "bulletList",
    ]);
  });

  it("joins consecutive non-bullet lines with hardBreak, not a lost newline", () => {
    const d = doc("Line one\nLine two");
    expect(d.content).toHaveLength(1);
    const kinds = (d.content[0].content as { type: string }[]).map(
      (n) => n.type,
    );
    expect(kinds).toEqual(["text", "hardBreak", "text"]);
  });

  it("normalises CRLF", () => {
    const d = doc("•\tOne.\r\n•\tTwo.");
    expect(d.content[0].content).toHaveLength(2);
  });

  it("returns a single empty paragraph for empty input", () => {
    const d = doc("   \n  ");
    expect(d.content).toEqual([{ type: "paragraph" }]);
  });
});

describe("docToText round trip", () => {
  it("survives a paste-shaped job description", () => {
    const original = [
      "Key Responsibilities",
      "• Respond promptly to customer inquiries.",
      "• Assist customers with billing.",
      "",
      "Qualifications",
      "• High school diploma.",
    ].join("\n");
    expect(docToText(textToDoc(original))).toBe(original);
  });

  it("preserves single line breaks inside a paragraph", () => {
    expect(docToText(textToDoc("Line one\nLine two"))).toBe(
      "Line one\nLine two",
    );
  });
});

describe("renderTiptap", () => {
  it("renders a bulletList as ul/li", () => {
    const html = renderTiptap(textToDoc("• One\n• Two"));
    expect(html).toBe("<ul><li><p>One</p></li><li><p>Two</p></li></ul>");
  });

  it("converts newlines left inside a text node into <br/>", () => {
    // Safety net for the ~8 job rows already stored as one flat paragraph
    // with embedded \n. Without this they render as one run-on line.
    const legacy = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A\nB" }] },
      ],
    };
    expect(renderTiptap(legacy as never)).toBe("<p>A<br/>B</p>");
  });

  it("still escapes HTML in text", () => {
    const legacy = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>x</script>\nsafe" }],
        },
      ],
    };
    expect(renderTiptap(legacy as never)).toBe(
      "<p>&lt;script&gt;x&lt;/script&gt;<br/>safe</p>",
    );
  });

  it("renders underline and strike marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "under", marks: [{ type: "underline" }] },
            { type: "text", text: "struck", marks: [{ type: "strike" }] },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe(
      "<p><u>under</u><s>struck</s></p>",
    );
  });

  it("nests bold and underline on the same run", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "both",
              marks: [{ type: "bold" }, { type: "underline" }],
            },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe("<p><u><strong>both</strong></u></p>");
  });
});
