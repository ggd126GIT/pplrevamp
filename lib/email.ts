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

/** Internal notification to the .ppl team. No-op if Resend/NOTIFY not set. */
export async function sendInternalNotification(
  subject: string,
  data: Record<string, unknown>,
): Promise<void> {
  const resend = getResend();
  if (!resend || !NOTIFY) {
    console.warn("[email] skipped internal notification (Resend not configured)");
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: NOTIFY,
    subject,
    html: shell(
      subject,
      `<table style="border-collapse:collapse;width:100%">${rows(data)}</table>`,
    ),
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
