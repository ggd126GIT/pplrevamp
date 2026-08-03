"use client";

import { useEffect, useState } from "react";

/**
 * Fetches a signed issue-time token when a form mounts, so the server can tell
 * a human filling in fields from a script posting instantly.
 *
 * The pages carrying these forms are statically rendered, so the token has to
 * come from a request rather than the initial HTML. Returns "" until it lands;
 * with the feature disabled the endpoint returns null and "" is what posts,
 * which the server reads as "disabled" and waves through.
 */
export function useFormToken(): string {
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/form-token", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { token?: string | null }) => {
        if (!cancelled && typeof json.token === "string") setToken(json.token);
      })
      .catch(() => {
        // Same-origin, so a failure here means the server is unreachable and
        // the submission itself would fail anyway. Nothing useful to recover.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return token;
}

/** Drop-in hidden field for forms that build their body from FormData. */
export function FormTokenField() {
  const token = useFormToken();
  return <input type="hidden" name="formToken" value={token} readOnly />;
}
