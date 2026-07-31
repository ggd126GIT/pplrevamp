"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Whether Turnstile is configured. When false the widget renders nothing and
 * forms must NOT gate their submit button, so the site behaves exactly as it
 * did before Turnstile existed.
 */
export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Module-level so three forms on three pages share one script load. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      el.remove(); // don't leave a dead <script> tag behind for the next retry
      scriptPromise = null; // let a later mount retry
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(el);
  });

  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

export function TurnstileWidget({
  onToken,
  ref,
}: {
  onToken: (token: string | null) => void;
  ref?: React.Ref<TurnstileHandle>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onToken(null);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        // React 18+ StrictMode double-invokes effects in dev; without this the
        // widget renders twice into the same container.
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          // Tokens expire after ~5 minutes, which a long discovery form outlives.
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setFailed(true);
          },
          theme: "light",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // onToken is intentionally excluded: callers pass an inline function, and
    // re-running this effect would tear down and re-render the widget on every
    // parent render, losing the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p className="mt-2 text-sm text-charcoal/70">
          Verification could not load, so this form cannot be submitted. Please
          refresh the page, or disable your ad blocker and try again.
        </p>
      )}
    </div>
  );
}

/**
 * Everything a form needs to use Turnstile.
 *
 * `reset()` exists here rather than in each form because resetting after a
 * failed submit is the one rule this feature breaks on if forgotten: tokens are
 * single-use, so without it a visitor who mistypes their email is trapped in a
 * loop where every retry fails.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const ref = useRef<TurnstileHandle>(null);

  const reset = useCallback(() => {
    ref.current?.reset();
    setToken(null);
  }, []);

  return {
    token,
    setToken,
    ref,
    reset,
    /** True when a token is required but not yet available — gate submit on this. */
    blocked: TURNSTILE_ENABLED && !token,
  };
}
