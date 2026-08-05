import { describe, expect, it } from "vitest";
import { firstTouch, type TouchRow } from "./attribution";

const row = (over: Partial<TouchRow> = {}): TouchRow => ({
  path: "/",
  source: "google",
  referrer: "https://www.google.com/",
  utm: null,
  country: "PH",
  created_at: "2026-08-05T10:00:00Z",
  ...over,
});

describe("firstTouch", () => {
  it("returns null when the session has no page views", () => {
    expect(firstTouch([])).toBeNull();
  });

  // The whole point of first-touch: by the time someone submits, the referrer
  // is this site, and the source would read "direct" or "internal".
  it("takes the earliest view, not the latest", () => {
    const out = firstTouch([
      row({ created_at: "2026-08-05T10:05:00Z", source: "internal", path: "/contact" }),
      row({ created_at: "2026-08-05T10:00:00Z", source: "linkedin", path: "/services" }),
    ]);
    expect(out?.source).toBe("linkedin");
    expect(out?.landing_path).toBe("/services");
  });

  it("carries the utm object through untouched", () => {
    const utm = { utm_source: "li", utm_campaign: "launch" };
    expect(firstTouch([row({ utm })])?.utm).toEqual(utm);
  });

  it("keeps referrer and country from the landing view", () => {
    const out = firstTouch([row({ referrer: "https://x.com/", country: "AU" })]);
    expect(out?.referrer).toBe("https://x.com/");
    expect(out?.country).toBe("AU");
  });

  it("records how many views the session had before submitting", () => {
    expect(firstTouch([row(), row(), row()])?.views).toBe(3);
  });

  // Unparseable timestamps must not silently reorder the session.
  it("ignores rows with an unusable timestamp when ordering", () => {
    const out = firstTouch([
      row({ created_at: "not-a-date", source: "junk" }),
      row({ created_at: "2026-08-05T09:00:00Z", source: "bing" }),
    ]);
    expect(out?.source).toBe("bing");
  });

  it("still returns something when every timestamp is unusable", () => {
    const out = firstTouch([row({ created_at: "nope", source: "reddit" })]);
    expect(out?.source).toBe("reddit");
  });

  it("normalises missing fields to null rather than undefined", () => {
    const out = firstTouch([
      row({ source: null, referrer: null, utm: null, country: null }),
    ]);
    expect(out).toEqual({
      source: null,
      referrer: null,
      utm: null,
      country: null,
      landing_path: "/",
      views: 1,
    });
  });
});
