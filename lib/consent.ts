/**
 * Cookie-consent state for the analytics tag.
 *
 * The site's own analytics are cookieless and run regardless — they need no
 * consent and are not covered here. This gates Google Analytics only, which is
 * the one thing on the site that sets cookies.
 *
 * The gate is "do not load at all until granted", not Google's Consent Mode
 * denied-default. Consent Mode still contacts Google on every page to send
 * cookieless pings; not loading the script means a visitor who has not accepted
 * never touches Google at all. That is the stronger promise, and it is the one
 * the privacy policy makes.
 */

export const CONSENT_KEY = "ppl-cookie-consent";

/** Fired on the window when the choice changes, so the tag can react in-page. */
export const CONSENT_EVENT = "ppl:consent-change";

export type ConsentChoice = "granted" | "denied";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Anything that is not exactly one of the two known values is treated as "no
 * decision yet". A half-written or hand-edited value must re-ask rather than be
 * guessed at — guessing wrong in the granted direction sets cookies nobody
 * agreed to.
 */
export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  return raw === "granted" || raw === "denied" ? raw : null;
}

/** localStorage throws outright in some privacy modes, so every access is guarded. */
function defaultStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readConsent(
  store: Store | null = defaultStore(),
): ConsentChoice | null {
  if (!store) return null;
  try {
    return parseConsent(store.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(
  choice: ConsentChoice,
  store: Store | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(CONSENT_KEY, choice);
  } catch {
    // A visitor who blocks storage simply gets asked again next visit. That is
    // the correct failure direction: no silent grant.
  }
}

/** Withdrawing consent is a right under the DPA, so it has to be reachable. */
export function clearConsent(store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.removeItem(CONSENT_KEY);
  } catch {
    // Nothing to do — see writeConsent.
  }
}
