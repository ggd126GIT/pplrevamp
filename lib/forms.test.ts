import { describe, expect, it } from "vitest";
import { isEmail, isNonEmpty, isWithinLength, MAX_MESSAGE_LENGTH } from "./forms";

describe("isEmail", () => {
  it("accepts a well-formed address", () => {
    expect(isEmail("jane@example.com")).toBe(true);
  });
  it("rejects malformed or non-string input", () => {
    expect(isEmail("not-an-email")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail(123)).toBe(false);
  });
});

describe("isNonEmpty", () => {
  it("accepts strings with non-whitespace content", () => {
    expect(isNonEmpty("hi")).toBe(true);
    expect(isNonEmpty("  x  ")).toBe(true);
  });
  it("rejects empty, whitespace-only, and non-strings", () => {
    expect(isNonEmpty("")).toBe(false);
    expect(isNonEmpty("   ")).toBe(false);
    expect(isNonEmpty(null)).toBe(false);
  });
});

describe("isWithinLength", () => {
  it("accepts strings at or under the limit", () => {
    expect(isWithinLength("hello", 5)).toBe(true);
    expect(isWithinLength("", 5)).toBe(true);
    expect(isWithinLength("a".repeat(MAX_MESSAGE_LENGTH), MAX_MESSAGE_LENGTH)).toBe(true);
  });
  it("rejects strings over the limit", () => {
    expect(isWithinLength("abcdef", 5)).toBe(false);
    expect(isWithinLength("a".repeat(MAX_MESSAGE_LENGTH + 1), MAX_MESSAGE_LENGTH)).toBe(false);
  });
  it("rejects non-strings", () => {
    expect(isWithinLength(undefined, 5)).toBe(false);
    expect(isWithinLength(42, 5)).toBe(false);
  });
});
