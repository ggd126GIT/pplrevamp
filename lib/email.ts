import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? ".ppl Solutions <onboarding@resend.dev>";
const NOTIFY = process.env.CONTACT_NOTIFY_EMAIL;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function shell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#232b31">
    <div style="background:linear-gradient(100deg,#a945cc,#fd9224);padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">.ppl Solutions, Inc.</span>
    </div>
    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px;color:#14181c">${title}</h2>
      ${bodyHtml}
    </div>
  </div>`;
}

function rows(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#7a7a7a;vertical-align:top">${escape(
          humanize(k),
        )}</td><td style="padding:6px 0;color:#232b31">${escape(
          String(v),
        )}</td></tr>`,
    )
    .join("");
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type EmailAttachment = { filename: string; content: Buffer };

export type NotificationOptions = {
  attachments?: EmailAttachment[];
  /** Override recipient (e.g. a jobs@ inbox). Falls back to CONTACT_NOTIFY_EMAIL. */
  to?: string;
};

/** Internal notification to the .ppl team. No-op if Resend/NOTIFY not set. */
export async function sendInternalNotification(
  subject: string,
  data: Record<string, unknown>,
  { attachments, to }: NotificationOptions = {},
): Promise<void> {
  const resend = getResend();
  const recipient = to?.trim() || NOTIFY;
  if (!resend || !recipient) {
    console.warn("[email] skipped internal notification (Resend not configured)");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: recipient,
    subject,
    html: shell(
      subject,
      `<table style="border-collapse:collapse;width:100%">${rows(data)}</table>`,
    ),
    // Resend serializes the request body as JSON, which mangles a raw Buffer
    // into {"type":"Buffer",...} and silently drops the attachment. Send the
    // content as a base64 string, which the Resend API accepts directly.
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
    })),
  });
}

/**
 * Await several sends independently and log whichever ones fail.
 *
 * `Promise.all` would reject on the first failure — and because a rejected
 * auto-reply (Resend test mode rejects any non-signup recipient) resolves the
 * batch immediately, the internal notification's request could still be in
 * flight when a serverless function freezes, silently losing it. Never throws.
 */
export async function settleSends(
  scope: string,
  sends: Record<string, Promise<unknown>>,
): Promise<void> {
  const entries = Object.entries(sends);
  const results = await Promise.allSettled(entries.map(([, p]) => p));
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[${scope}] ${entries[i][0]} failed:`, result.reason);
    }
  });
}

/** Auto-reply to the person who submitted. No-op if Resend not set. */
export async function sendAutoReply(
  to: string,
  name: string,
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] skipped auto-reply (Resend not configured)");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Thank you for contacting .ppl Solutions, Inc.",
    html: shell(
      `Hi ${escape(name) || "there"},`,
      `<p style="line-height:1.6">Thank you for contacting us. One of our .ppl will get back to you regarding your inquiry.</p>
       <p style="line-height:1.6;margin-top:16px">Warm regards,<br/>The .ppl Solutions Team</p>`,
    ),
  });
}
