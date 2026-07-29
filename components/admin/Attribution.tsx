import { actorLabel, timeAgo } from "@/lib/activity";

type Staff = { full_name: string | null; email: string | null } | null;

/**
 * The "who touched this" line under a post or job in the admin lists.
 * Rows predating attribution have no creator, which shows as an em dash
 * rather than a fabricated name.
 */
export function Attribution({
  createdBy,
  updatedBy,
  updatedAt,
}: {
  createdBy: Staff;
  updatedBy: Staff;
  updatedAt: string | null;
}) {
  const creator = createdBy
    ? actorLabel(createdBy.full_name, createdBy.email)
    : "—";
  const editor = updatedBy
    ? actorLabel(updatedBy.full_name, updatedBy.email)
    : null;
  const when = timeAgo(updatedAt);

  return (
    <p className="mt-1 truncate text-xs text-charcoal/50">
      Created by <span className="text-charcoal/70">{creator}</span>
      {editor && (
        <>
          {" · "}Last edited by{" "}
          <span className="text-charcoal/70">{editor}</span>
          {when && `, ${when}`}
        </>
      )}
    </p>
  );
}
