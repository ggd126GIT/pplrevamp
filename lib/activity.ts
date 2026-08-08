import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Must stay in step with `activity_entity_type_check`. A value allowed here and
 * not by the constraint fails the insert, and `logActivity` swallows that by
 * design — so the entry would vanish silently.
 */
export type ActivityEntity = "post" | "job" | "application";

export type ActivityAction =
  | "created"
  | "edited"
  | "published"
  | "unpublished"
  | "opened"
  | "closed"
  | "deleted"
  | "exported";

/** Tailwind classes per action, so the feed reads at a glance. */
export const ACTION_STYLES: Record<ActivityAction, string> = {
  created: "bg-purple/10 text-purple",
  edited: "bg-black/[0.06] text-charcoal/70",
  published: "bg-emerald-100 text-emerald-700",
  unpublished: "bg-amber-100 text-amber-700",
  opened: "bg-emerald-100 text-emerald-700",
  closed: "bg-amber-100 text-amber-700",
  deleted: "bg-red-100 text-red-700",
  // Personal data leaving the system is worth spotting in the feed at a glance,
  // so it gets its own colour rather than sharing the neutral "edited" grey.
  exported: "bg-sky-100 text-sky-700",
};

/**
 * How to name a staff member in attribution. `full_name` is nullable and
 * self-editable, so the email backstops it; "Unknown" is the last resort for
 * an actor whose profile has since been deleted.
 */
export function actorLabel(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  return fullName?.trim() || email?.trim() || "Unknown";
}

/**
 * Which action a status change represents. Posts move between draft and
 * published; jobs between open and closed. Anything else is a plain edit.
 */
export function deriveAction(
  entityType: ActivityEntity,
  prevStatus: string | null | undefined,
  nextStatus: string,
): ActivityAction {
  // An unknown previous state can't be characterised as a transition.
  if (prevStatus == null || prevStatus === nextStatus) return "edited";

  if (entityType === "post") {
    if (nextStatus === "published") return "published";
    if (nextStatus === "draft") return "unpublished";
  } else {
    if (nextStatus === "open") return "opened";
    if (nextStatus === "closed") return "closed";
  }
  return "edited";
}

/** Compact relative timestamp: "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  // Clock skew between server and DB can put a fresh row slightly in the future.
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(then).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Append one entry to the activity log.
 *
 * Call this only after the underlying mutation has succeeded — an action that
 * failed did not happen. It never throws and never returns an error: losing a
 * log entry is bad, but losing someone's post because the log write failed is
 * worse.
 */
export async function logActivity(
  supabase: SupabaseServerClient,
  entry: {
    action: ActivityAction;
    entityType: ActivityEntity;
    entityId: string | null;
    entityTitle: string;
    actorId: string | null;
  },
): Promise<void> {
  try {
    let label = "Unknown";

    if (entry.actorId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", entry.actorId)
        .single();
      label = actorLabel(profile?.full_name, profile?.email);
    }

    const { error } = await supabase.from("activity").insert({
      actor_id: entry.actorId,
      actor_label: label,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_title: entry.entityTitle,
      action: entry.action,
    });

    if (error) {
      console.error("[activity] insert failed:", error.message, entry);
    }
  } catch (error) {
    console.error("[activity] unexpected failure:", error, entry);
  }
}
