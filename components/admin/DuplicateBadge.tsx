import { AlertTriangle, Ban, History } from "lucide-react";
import {
  repeatLabel,
  wasRejectedBefore,
  type MatchResult,
} from "@/lib/applicantMatch";
import { formatManilaDate } from "@/lib/dates";

/**
 * Prior-application context for one applicant.
 *
 * Confirmed and possible matches are presented differently on purpose. A shared
 * email is the same person; a shared phone or name is a prompt to look, and
 * dressing it up as a finding would get real candidates rejected by mistake.
 */
export function DuplicateBadge({
  matches,
  blocked,
}: {
  matches: MatchResult;
  /** Blacklist reason, when this applicant is blocked. */
  blocked?: string | null;
}) {
  const repeat = repeatLabel(matches);
  const rejected = wasRejectedBefore(matches);

  if (!repeat && !matches.possible.length && !blocked) return null;

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      {blocked && (
        <p className="inline-flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1 font-semibold text-red-700">
          <Ban className="mt-px size-3.5 shrink-0" />
          <span>
            Blocked — <span className="font-normal">{blocked}</span>
          </span>
        </p>
      )}

      {repeat && (
        <p
          className={
            rejected
              ? "inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-800"
              : "inline-flex items-start gap-1.5 rounded-lg bg-mist px-2 py-1 font-medium text-charcoal/80"
          }
        >
          {rejected ? (
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
          ) : (
            <History className="mt-px size-3.5 shrink-0" />
          )}
          <span>
            {repeat}
            {rejected && " · previously rejected"}
          </span>
        </p>
      )}

      {matches.confirmed.length > 0 && (
        <ul className="text-charcoal/60">
          {matches.confirmed.map((m) => (
            <li key={m.row.id}>
              {formatManilaDate(m.row.created_at)} ·{" "}
              {m.row.job_title ?? "unknown role"} · {m.row.status}
            </li>
          ))}
        </ul>
      )}

      {matches.possible.length > 0 && (
        <p className="text-charcoal/50">
          Possible repeat —{" "}
          {matches.possible
            .map(
              (m) =>
                `same ${m.reason} as ${m.row.first_name} ${m.row.last_name} (${formatManilaDate(m.row.created_at)})`,
            )
            .join("; ")}
        </p>
      )}
    </div>
  );
}
