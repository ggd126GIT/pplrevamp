# .ppl Website — Three Requests

**To:** Joey Lianko
**From:** Gilbert
**Date:** 30 July 2026
**Summary:** One security issue on your server, and two access permissions that are currently
holding up the website launch.

---

## 1. Your server has a security issue

The Hostinger server is running a database system that came pre-installed with it. That database
is currently **reachable from the public internet**, and installations like this normally ship with
well-known default passwords. If those were never changed, anyone could read or change the data in
it.

We don't use this database — the website runs on a separate, properly secured one — so the safest
fix is simply to switch it off and remove it. That also frees up about half the server's memory and
around 18 GB of disk space, which the website will need.

**What I need from you:** server access (request 2 below). Once I have it, this takes a few minutes.

---

## 2. Full access to the Hostinger account

I'm currently managing your Hostinger account in a limited "impersonate" mode. Hostinger blocks
security settings in that mode, so I can't reach the server's command line or manage its access
settings — which is everything the deployment needs.

**Two ways to solve it. Either works:**

**Option A — add me as a user on the account.** Cleanest, because it prevents this coming up again
at every step.

**Option B — run three commands yourself.** In Hostinger: your VPS → Browser terminal → paste the
block in the appendix. Takes about two minutes. Note that this grants me command-line access to the
server.

---

## 3. Access to the Cloudflare account

Your domain `pplsolutionsinc.com` has its DNS settings hosted at **Cloudflare**, in an account that
nobody on our side can get into. Hostinger is only the registrar — the actual settings live at
Cloudflare.

Most likely it was set up by whoever configured your Microsoft 365 email, since that same account
also holds your email and device-management settings.

**Until we get access, two things cannot happen:**

- **Pointing `pplsolutionsinc.com` at the new website.** The domain still shows the old WordPress
  site and we have no way to change that.
- **Turning on the contact and careers form emails.** Enquiries are being saved to the database, but
  no notification email can be sent until we add three records at Cloudflare.

**What I need from you:** either access to that account, or an introduction to whoever manages it —
they only need to paste in three records, which I'll supply.

> One important note: please **don't** let Hostinger move the domain's nameservers to Hostinger, and
> don't accept any prompt offering to do so. Your Microsoft 365 email settings live in that
> Cloudflare account, and moving things carelessly can take company email offline. This needs to be
> done deliberately, in the right order.

---

## Where this leaves the launch

| | Status |
|---|---|
| Website built and tested | ✅ Done — reviewable on the staging site |
| Content and design changes from your feedback | ✅ Done |
| Deploying to your server | ⛔ Blocked by request 2 |
| Switching the domain over | ⛔ Blocked by request 3 |
| Contact form emails | ⛔ Blocked by request 3 |

**Requests 2 and 3 are the only things holding up launch.** Everything else is finished and waiting.

Request 3 is likely the slower one, since it depends on finding whoever set up Cloudflare — so it's
worth starting that conversation first, even before the server access.

Happy to jump on a quick call for any of this.

---

## Appendix — commands for Option B

Only needed if you'd rather not add me as a user. In Hostinger: your VPS → **Browser terminal** →
paste this whole block and press Enter. It should print `OK`.

```bash
usermod -aG sudo gilbertd
mkdir -p /root/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC9UuSAs+wciHosFDZwQdOpIMqmSgM1uRkfbF1nmsULI gilbert-ppl-vps" >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
echo OK
```

What it does, in plain terms: gives my existing server account administrator rights, and installs a
secure key so I can log in without a password being shared over email or chat.
