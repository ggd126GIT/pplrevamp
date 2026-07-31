import { describe, expect, it } from "vitest";
import { renderTiptap } from "./tiptap";

/**
 * Job and post bodies are authored in Tiptap and stored as its JSON, so these
 * tests are about rendering that JSON to HTML safely — escaping, marks, and the
 * legacy rows that kept their line breaks inside a text node.
 */

describe("renderTiptap", () => {
  it("renders a bulletList as ul/li", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "One" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Two" }] },
              ],
            },
          ],
        },
      ],
    };
    expect(renderTiptap(doc as never)).toBe(
      "<ul><li><p>One</p></li><li><p>Two</p></li></ul>",
    );
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
