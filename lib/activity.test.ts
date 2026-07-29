import { describe, expect, it } from "vitest";
import { actorLabel, deriveAction, timeAgo } from "./activity";

describe("actorLabel", () => {
  it("prefers the full name", () => {
    expect(actorLabel("Joey Lianko", "joey.lianko@pplsolutionsinc.com")).toBe(
      "Joey Lianko",
    );
  });

  it("falls back to the email when the name is missing or blank", () => {
    expect(actorLabel(null, "tina.loneza@pplsolutionsinc.com")).toBe(
      "tina.loneza@pplsolutionsinc.com",
    );
    expect(actorLabel("   ", "tina.loneza@pplsolutionsinc.com")).toBe(
      "tina.loneza@pplsolutionsinc.com",
    );
    expect(actorLabel(undefined, "tina.loneza@pplsolutionsinc.com")).toBe(
      "tina.loneza@pplsolutionsinc.com",
    );
  });

  it("returns Unknown when both are missing", () => {
    expect(actorLabel(null, null)).toBe("Unknown");
    expect(actorLabel("", "")).toBe("Unknown");
  });

  it("trims surrounding whitespace off the name it returns", () => {
    expect(actorLabel("  Clari Porras  ", null)).toBe("Clari Porras");
  });
});

describe("deriveAction", () => {
  it("maps post status transitions", () => {
    expect(deriveAction("post", "draft", "published")).toBe("published");
    expect(deriveAction("post", "published", "draft")).toBe("unpublished");
  });

  it("maps job status transitions", () => {
    expect(deriveAction("job", "closed", "open")).toBe("opened");
    expect(deriveAction("job", "open", "closed")).toBe("closed");
  });

  it("calls an unchanged status a plain edit", () => {
    expect(deriveAction("post", "draft", "draft")).toBe("edited");
    expect(deriveAction("post", "published", "published")).toBe("edited");
    expect(deriveAction("job", "open", "open")).toBe("edited");
    expect(deriveAction("job", "closed", "closed")).toBe("edited");
  });

  it("does not characterise a transition it cannot see", () => {
    // No previous status means the row read failed — claiming "published"
    // would be a guess, so it degrades to the neutral action.
    expect(deriveAction("post", null, "published")).toBe("edited");
    expect(deriveAction("post", undefined, "draft")).toBe("edited");
    expect(deriveAction("job", null, "closed")).toBe("edited");
  });

  it("does not cross entity vocabularies", () => {
    // A job never reports "published"; a post never reports "opened".
    expect(deriveAction("job", "open", "published")).toBe("edited");
    expect(deriveAction("post", "draft", "open")).toBe("edited");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-07-29T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it("reports anything under a minute as just now", () => {
    expect(timeAgo(ago(0), now)).toBe("just now");
    expect(timeAgo(ago(59 * SECOND), now)).toBe("just now");
  });

  it("switches units at each boundary", () => {
    expect(timeAgo(ago(60 * SECOND), now)).toBe("1m ago");
    expect(timeAgo(ago(59 * MINUTE), now)).toBe("59m ago");
    expect(timeAgo(ago(60 * MINUTE), now)).toBe("1h ago");
    expect(timeAgo(ago(23 * HOUR), now)).toBe("23h ago");
    expect(timeAgo(ago(24 * HOUR), now)).toBe("1d ago");
    expect(timeAgo(ago(29 * DAY), now)).toBe("29d ago");
  });

  it("shows an absolute date beyond 30 days", () => {
    expect(timeAgo(ago(40 * DAY), now)).toBe("Jun 19, 2026");
  });

  it("treats a future timestamp as just now rather than negative", () => {
    // Clock skew between the app server and Postgres can do this.
    expect(timeAgo(new Date(now + 5 * MINUTE).toISOString(), now)).toBe(
      "just now",
    );
  });

  it("returns an empty string for missing or unparseable input", () => {
    expect(timeAgo(null, now)).toBe("");
    expect(timeAgo(undefined, now)).toBe("");
    expect(timeAgo("not a date", now)).toBe("");
  });
});
