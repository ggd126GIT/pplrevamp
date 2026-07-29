import { AlertTriangle, Mail } from "lucide-react";
import type { EmailRouting as Routing } from "@/lib/email";

/**
 * Shows where each form's internal notification is addressed.
 *
 * Exists so the addresses can be confirmed with the client without anyone
 * needing access to the inboxes themselves. It reports the resolved routing,
 * not the raw env vars, and says plainly when mail cannot actually arrive —
 * a list of addresses that silently receive nothing would be worse than no
 * panel at all.
 */
export function EmailRouting({ routing }: { routing: Routing }) {
  const nothingConfigured = routing.rows.every((r) => !r.recipients.length);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
      <div className="flex items-center gap-2">
        <Mail className="size-4 text-purple" />
        <h2 className="font-display text-lg font-bold text-ink">
          Where form notifications go
        </h2>
      </div>
      <p className="mt-1 text-sm text-charcoal/60">
        The inbox each form emails when someone submits it.
      </p>

      <ul className="mt-5 divide-y divide-black/[0.06] border-y border-black/[0.06]">
        {routing.rows.map((row) => (
          <li
            key={row.form}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
          >
            <span className="text-sm font-semibold text-ink">{row.form}</span>
            <span className="min-w-0 text-right">
              {row.recipients.length ? (
                <span className="break-all text-sm text-charcoal/80">
                  {row.recipients.join(", ")}
                </span>
              ) : (
                <span className="text-sm font-semibold text-red-600">
                  Not configured — notifications are discarded
                </span>
              )}
              <span className="block text-xs text-charcoal/45">
                {row.source}
                {row.fellBack && " (JOBS_NOTIFY_EMAIL unset — using the contact inbox)"}
                {row.dropped > 0 &&
                  ` · ${row.dropped} entry dropped as invalid or duplicate`}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-charcoal/50">
        Sent from <span className="text-charcoal/70">{routing.from}</span>
      </p>

      {!routing.apiKeySet && (
        <Notice>
          <strong>No Resend API key is set.</strong> No email is being sent at
          all — form submissions are still saved to the database, but nobody is
          notified.
        </Notice>
      )}

      {routing.apiKeySet && routing.sandboxSender && (
        <Notice>
          <strong>Sending domain is not verified yet.</strong> While the sender
          is Resend&rsquo;s shared sandbox address, Resend only delivers to the
          Resend account&rsquo;s own signup inbox — the addresses above will not
          receive anything, and visitor auto-replies are rejected. Submissions
          are still recorded here regardless.
        </Notice>
      )}

      {routing.apiKeySet && nothingConfigured && (
        <Notice>
          <strong>No recipients configured.</strong> Notifications are dropped
          silently — nothing fails visibly, so this is easy to miss.
        </Notice>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
