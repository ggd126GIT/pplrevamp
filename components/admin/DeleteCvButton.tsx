"use client";

import { useActionState, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCv, type DeleteCvState } from "@/app/admin/applications/actions";

/**
 * Two-step delete: the button arms, then confirms.
 *
 * Deliberately not `window.confirm` — a native dialog is unstyled, blocks the
 * whole tab, and is invisible to any automated check of this page. An inline
 * confirm is also harder to dismiss by reflex, which is the point: removing a CV
 * cannot be undone and the applicant will not send it again.
 */
export function DeleteCvButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteCvState, FormData>(
    deleteCv,
    undefined,
  );

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" /> Delete CV
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs font-medium text-red-700">
        Delete permanently? This cannot be undone.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Deleting…
            </>
          ) : (
            <>
              <Trash2 className="size-3.5" /> Yes, delete
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:bg-mist"
        >
          Cancel
        </button>
      </div>
      {state?.error && (
        <p className="text-xs font-medium text-red-600">{state.error}</p>
      )}
    </form>
  );
}
