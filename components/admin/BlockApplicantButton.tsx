"use client";

import { useState } from "react";
import { Ban, ShieldOff } from "lucide-react";
import {
  blockApplicant,
  unblockApplicant,
} from "@/app/admin/applications/actions";

/**
 * Add or lift a blacklist entry for one person, keyed by email.
 *
 * Blocking opens an inline form rather than acting on the first click, because
 * **the reason is mandatory** — there is nowhere else to type it, and the
 * database rejects a null. That constraint is deliberate: the DPA gives an
 * applicant the right to see what is held about them, so every entry has to be
 * a fact that survives being read back. The placeholder shows the shape of a
 * good one.
 *
 * Unblocking is a single click. It removes a restriction rather than imposing
 * one, so the asymmetry is intentional — the risky direction is the one that
 * needs friction.
 */
export function BlockApplicantButton({
  emailKey,
  blocked,
}: {
  emailKey: string;
  blocked: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (blocked) {
    return (
      <form action={unblockApplicant}>
        <input type="hidden" name="emailKey" value={emailKey} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:bg-mist"
        >
          <ShieldOff className="size-3.5" /> Remove block
        </button>
      </form>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <Ban className="size-3.5" /> Block
      </button>
    );
  }

  return (
    <form action={blockApplicant} className="space-y-1.5">
      <input type="hidden" name="emailKey" value={emailKey} />
      <label className="sr-only" htmlFor={`block-reason-${emailKey}`}>
        Reason for blocking
      </label>
      <input
        id={`block-reason-${emailKey}`}
        name="reason"
        required
        autoFocus
        placeholder="e.g. No-show for two scheduled interviews"
        className="w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-xs"
      />
      <p className="text-[11px] leading-snug text-charcoal/50">
        State a fact — the applicant may request to see this.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          <Ban className="size-3.5" /> Block
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:bg-mist"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
