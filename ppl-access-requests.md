# .ppl Website — One Remaining Request

**To:** Joey Lianko (and Rafael Dayalo)
**From:** Gilbert
**Date:** 31 July 2026 *(supersedes the 30 July version, which listed three requests)*
**Summary:** The website is now built, deployed and running on your server. One access permission
is left before it can go live.

---

## Where things stand

**The new website is live on your Hostinger server and ready to review:**

**https://w2.pplsolutionsinc.com** — username `ppl`, password `Jaax4PvOUvE9`

It is password-protected on purpose, and hidden from Google, so nothing is public until you say so.
Your current WordPress site at www.pplsolutionsinc.com is untouched and still running normally.

Two of the three requests from the 30 July note are now resolved:

- ✅ **Server access** — sorted. No further action needed from you.
- ✅ **The server security issue** — fixed. The pre-installed database on your server was reachable
  from the public internet; it is now locked to the server itself and confirmed closed from outside.
  We left it running rather than removing it, in case something of yours depends on it. If nothing
  does, tell us and we'll remove it — that would free up roughly half the server's memory.

---

## The one thing still needed: Cloudflare DNS

Your domain's DNS settings are hosted at **Cloudflare**, in an account nobody on our side can sign
in to. Hostinger is only the registrar — the actual settings live at Cloudflare.

**Rafael is the most likely person to have this.** Setting up Microsoft 365 requires creating
several DNS records, and those records are sitting in that Cloudflare account. There's also a
specific clue: on 5 July, when the server was set up, someone added a record to that same account.

Rafael — if you have access, this is the ask. If not, could you point us to who does?

### Part A — three records to switch on website email (small, safe, ready now)

Right now, when someone submits the contact form or applies for a job, **the enquiry is saved but
nobody gets notified**. Three DNS records fix that.

They are all new entries on a `send.` prefix that doesn't currently exist. **They do not touch
Microsoft 365** — not the mail routing, not the sender policy, not autodiscover, nothing that
currently carries company email. That separation is deliberate.

This part can be done now, independently of the launch decision. It cannot affect anything live.

### Part B — pointing the domain at the new site (when you're ready to launch)

Two existing records get changed so `pplsolutionsinc.com` shows the new website instead of the old
WordPress one. This is the actual go-live moment, so it happens only on your say-so, and we'd want
to do it together on a call — it takes a few minutes and there's a specific order to follow.

**Before that call, one thing matters a lot:** we need to write down the current settings for those
two records first. They're the only way back to the WordPress site if anything goes wrong, and that
information exists nowhere except inside the Cloudflare account.

> **Please don't let Hostinger move the domain's nameservers to Hostinger**, and don't accept any
> prompt offering to do so. Your Microsoft 365 email settings live in that Cloudflare account, and
> moving them carelessly can take company email offline.

---

## Where this leaves the launch

| | Status |
|---|---|
| Website built, tested, and deployed to your server | ✅ Done — reviewable at the link above |
| Content and design changes from your feedback | ✅ Done |
| Server access | ✅ Resolved |
| Server security issue | ✅ Fixed |
| Contact and careers form emails | ⛔ Needs Part A |
| Switching the domain over | ⛔ Needs Part B, and your go-ahead |

**Part A is the one worth starting today** — it's small, carries no risk to anything currently
running, and it's the difference between enquiries being silently collected and someone actually
being told about them.

Happy to jump on a quick call for any of this.
