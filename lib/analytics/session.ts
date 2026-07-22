const KEY = "ppl_sid";

/**
 * Per-tab visitor id. sessionStorage so it dies with the tab — no cross-session
 * tracking, which is what lets us run without a consent banner.
 * Returns null when storage is unavailable (Safari private mode throws).
 */
export function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
