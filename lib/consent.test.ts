import { describe, it, expect } from "vitest";
import {
  CONSENT_KEY,
  parseConsent,
  readConsent,
  writeConsent,
  clearConsent,
} from "./consent";

function fakeStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

/** Storage can throw outright rather than return null (Safari private mode). */
const throwingStore = {
  getItem() {
    throw new Error("denied");
  },
  setItem() {
    throw new Error("denied");
  },
  removeItem() {
    throw new Error("denied");
  },
};

describe("parseConsent", () => {
  it("accepts the two known values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
  });

  it.each([null, undefined, "", "GRANTED", "true", "yes", "grante", "{}"])(
    "treats %o as no decision yet",
    (raw) => {
      expect(parseConsent(raw)).toBeNull();
    },
  );

  // The whole gate hinges on this: an unrecognised value must never read as
  // consent, or a corrupt entry silently switches cookies on.
  it("never infers consent from an unrecognised value", () => {
    for (const raw of ["1", "on", "accepted", "granted ", " granted"]) {
      expect(parseConsent(raw)).not.toBe("granted");
    }
  });
});

describe("readConsent", () => {
  it("reads a stored choice", () => {
    expect(readConsent(fakeStore({ [CONSENT_KEY]: "granted" }))).toBe("granted");
    expect(readConsent(fakeStore({ [CONSENT_KEY]: "denied" }))).toBe("denied");
  });

  it("returns null when nothing is stored", () => {
    expect(readConsent(fakeStore())).toBeNull();
  });

  it("returns null when storage is unavailable", () => {
    expect(readConsent(null)).toBeNull();
  });

  it("returns null rather than throwing when storage throws", () => {
    expect(readConsent(throwingStore)).toBeNull();
  });
});

describe("writeConsent", () => {
  it("persists the choice under the shared key", () => {
    const store = fakeStore();
    writeConsent("granted", store);
    expect(store.data[CONSENT_KEY]).toBe("granted");
  });

  it("overwrites an earlier choice", () => {
    const store = fakeStore({ [CONSENT_KEY]: "granted" });
    writeConsent("denied", store);
    expect(readConsent(store)).toBe("denied");
  });

  it("does not throw when storage is unavailable or throws", () => {
    expect(() => writeConsent("granted", null)).not.toThrow();
    expect(() => writeConsent("granted", throwingStore)).not.toThrow();
  });
});

describe("clearConsent", () => {
  it("removes the stored choice so the banner asks again", () => {
    const store = fakeStore({ [CONSENT_KEY]: "granted" });
    clearConsent(store);
    expect(readConsent(store)).toBeNull();
  });

  it("does not throw when storage is unavailable or throws", () => {
    expect(() => clearConsent(null)).not.toThrow();
    expect(() => clearConsent(throwingStore)).not.toThrow();
  });
});
