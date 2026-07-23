"use client";

import { useState } from "react";

/**
 * Renders text in full when short, or a snippet with a "Show more" toggle when
 * it exceeds `limit` characters. Keeps long inquiry messages from blowing out
 * the card layout on the admin dashboard.
 */
export function ExpandableText({
  text,
  limit = 200,
}: {
  text: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= limit) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }

  const shown = expanded ? text : `${text.slice(0, limit).trimEnd()}…`;

  return (
    <span className="whitespace-pre-wrap break-words">
      {shown}{" "}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="whitespace-nowrap text-xs font-semibold text-purple hover:underline"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </span>
  );
}
