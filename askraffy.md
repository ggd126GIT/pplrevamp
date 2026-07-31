# DNS request — pplsolutionsinc.com

**For:** Rafael Dayalo
**From:** Gilbert
**Date:** 31 July 2026

Hi Rafael — Joey mentioned you set up our Microsoft 365, and you offered to help with DNS. Here's what we need.

We've rebuilt the .ppl Solutions website. It's finished and running on our Hostinger server, and you can look at it here:

**https://w2.pplsolutionsinc.com** — username `ppl`, password `Jaax4PvOUvE9`

It's password-protected and hidden from search engines on purpose. The current WordPress site at www.pplsolutionsinc.com is untouched and running normally.

**First, a quick check:** do you have access to the Cloudflare account that manages DNS for `pplsolutionsinc.com`? The nameservers are `kristin.ns.cloudflare.com` and `yisroel.ns.cloudflare.com`. We're assuming you do, since the Microsoft 365 records live in that zone — but if not, could you point us to whoever does?

---

## Request 1 — three records to switch on website email

**This is the one we'd like done now.** It's additive, it can't affect anything currently running, and it doesn't depend on any launch decision.

Right now, when someone submits the contact form or applies for a job, the enquiry is saved to our database but **no notification email is sent to anyone**. These three records fix that.

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey.send` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXuuFuB8+PI8tfU0JmpdXQqj4hu1AKENYxIpZB6SPdvnbXzXiVf47HyJXvR/AqDi5s4wswMhP0WW3L4XMtAGZl5Y93fTMhlLFlyosCXdW5QS+Lu5QAwREqUNTOd3LwfyccBuZ5zKLSnAAJDzR9kSBg5e7NaWlPyKbFTQu6HXZZpQIDAQAB` | — |
| MX | `send.send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
| TXT | `send.send` | `v=spf1 include:amazonses.com ~all` | — |

Three things worth flagging so nothing gets adjusted on the way in:

- **`send.send` is not a typo.** Cloudflare's Name field is relative to the zone, so enter these exactly as written — Cloudflare appends `pplsolutionsinc.com` itself. They resolve to `resend._domainkey.send.pplsolutionsinc.com` and `send.send.pplsolutionsinc.com`.

- **None of this touches Microsoft 365.** We are not modifying the root MX, the root SPF (`v=spf1 include:spf.protection.outlook.com -all`), autodiscover, enterpriseregistration, or anything else you configured. Everything here is a new name under a `send.` subdomain that doesn't currently exist. That isolation is deliberate — company email cannot be affected by these records.

- **There's no orange/grey cloud setting to worry about.** Cloudflare only proxies A, AAAA and CNAME records. TXT and MX are always DNS-only, so there's no toggle on these.

Once they're in, let us know and we'll verify from our side.

---

## Request 2 — pointing the domain at the new site (later, on Joey's go-ahead)

When the client is ready to launch, two existing records change:

| Name | Change to | Proxy |
|---|---|---|
| `@` | `187.127.121.54` | **DNS-only (grey cloud)** initially |
| `www` | `187.127.121.54` | **DNS-only (grey cloud)** initially |

**Before changing them, please record their current values somewhere.** Both are currently proxied, which means the WordPress server's real IP address isn't visible from outside — the Cloudflare dashboard is the only place it exists. If we ever need to roll back to the old site, those values are the only way to do it.

**Please set them to DNS-only (grey cloud) first, not proxied.** Two reasons:

1. Our SSL certificate is issued by Let's Encrypt over HTTP, and that check can't reach our server through Cloudflare's proxy.
2. If Cloudflare's SSL mode is Full (strict), it validates our origin certificate — which won't cover the new hostnames until step 1 has happened. Proxying first produces a 526 error.

So the order is: **grey cloud → we issue the certificate → then switch SSL mode to Full (strict) and turn the proxy on.**

This part takes a few minutes and we'd rather do it together on a call, so we can verify each step as it happens.

---

## One thing to avoid

Please **don't move the domain's nameservers to Hostinger**, and don't accept any prompt offering to do so. Hostinger is only the registrar and offers this as a convenience, but it rebuilds the zone from a scan and can silently drop records — including the Microsoft 365 ones carrying company email and device enrolment. That would be a company-wide outage rather than a website problem.

---

Happy to jump on a call for any of this, or to walk through it with you while you make the changes.

Thanks,
Gilbert
