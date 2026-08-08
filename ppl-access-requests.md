# .ppl Website — Access Requests

**To:** Rafael Dayalo · **cc:** Joey Lianko
**From:** Gilbert
**Date:** 8 August 2026 *(supersedes the 31 July and 7 August versions — everything they asked for is now done)*
**Summary:** The website is live. Two things are outstanding, neither urgent: one optional permission,
and moving the Google Analytics and Search Console accounts into .ppl's own hands.

---

## Everything previously requested is resolved

Kept here so nothing gets re-raised by mistake:

- ✅ **Server access** — resolved 31 July.
- ✅ **Server security issue** — the pre-installed database was reachable from the public internet;
  locked down and confirmed closed. Still running in case something depends on it — say the word and
  we'll remove it, which would free roughly half the server's memory.
- ✅ **Cloudflare DNS, Part A (website email)** — done. `send.pplsolutionsinc.com` is verified and
  the contact and careers forms deliver to `sales@` and `careers@`. Confirmed working end to end.
- ✅ **Cloudflare DNS, Part B (domain switchover)** — done. **The new site went live on
  www.pplsolutionsinc.com on 4 August 2026.** Microsoft 365 mail was untouched throughout.

---

## Request 1: approve HubSpot's email integration in Microsoft 365

**This is optional and nothing is blocked by it.** It is worth doing, but if the answer is no, we
lose one convenience and nothing else.

**Rafael — this one is yours**, as the Microsoft 365 administrator.

### Why we're asking

We've set up a HubSpot CRM account so enquiries from the website land somewhere structured rather
than in an inbox. That part is done and working.

The gap is what happens **after** someone replies. At the moment:

1. **The site publicly promises a reply within 1–2 business days**, and there is currently no way to
   check whether that is actually happening.
2. **A lead nobody answered looks identical to one that was handled well.** There is no record of
   follow-up.
3. **Conversation history sits in one person's mailbox.** If they're on leave or move on, the
   thread goes with them rather than staying attached to the customer.
4. **We can already see where a lead came from** — Google, LinkedIn, a referral — but not whether it
   turned into anything, because the reply happens outside the system.

Approving this closes that loop: emails to and from a customer are logged against that customer's
record automatically.

### What is actually being approved

Admin consent for the **HubSpot Office 365 integration**, so that named people can connect their own
work mailbox.

**What it does:** logs emails those people exchange with contacts in the CRM, and lets them send
tracked one-to-one email from HubSpot.

**What it does not do — worth being explicit:**

- It does **not** change mail routing, MX records, DNS, or SPF. Microsoft 365 mail flow is untouched.
- It does **not** give HubSpot access to the whole company's mail. Access is per person, and only
  for people who connect their own mailbox.
- It does **not** send bulk or marketing email. One-to-one only.

### A narrower scope, if you'd prefer

Rather than approving it for the whole organisation, **approve it for named people only** — in
practice Joey and Apol, or whoever actually owns lead follow-up. In Microsoft's admin centre that
means assigning the application to specific users instead of enabling it for everyone.

We'd suggest **not** including Gilbert's account. Logging a developer's email produces no useful
sales history.

**Reversible at any time:** revoke it under Enterprise applications in Microsoft, and disconnect in
HubSpot. Nothing needs migrating and nothing breaks.

### Two honest notes

**Read Microsoft's approval screen, not our summary.** It lists the exact permissions HubSpot asks
for. That screen is the authoritative version — we're describing the shape of the request.

**There's a question to answer before this one.** Connecting a mailbox only makes sense once we know
whose mailbox — i.e. who owns replying to enquiries. That's also question 7 in the lead-generation
note we've sent separately. **Answer that first; this request follows from it.**

---

## Request 2: move Google Analytics and Search Console into .ppl accounts

**Also not urgent, and nothing is at risk today.** But the longer it waits, the more history
accumulates in the wrong place, so it is worth starting now.

**This one is shared** — a small piece from Rafael, a small piece from whoever will use the reports.

### Why we're asking

Google Analytics and Google Search Console were set up during launch using **Gilbert's personal
Google account**, because waiting on company accounts would have meant launching with no
measurement at all. That was the right trade at the time. It is the wrong place for it to stay:

- The traffic history is .ppl's asset, not a contractor's.
- Nobody on the team can open the reports today without going through Gilbert.
- If that account ever went away, the access would go with it.

### The one thing that surprises everybody

Google can only grant access to a **Google account**, and a Microsoft 365 mailbox is not one. So
`name@pplsolutionsinc.com` cannot be added to either tool as things stand — this is the usual
sticking point, and it is not a licensing problem.

The fix is free: a Google account can be created **on an existing email address**. At
`accounts.google.com/signup`, choose *for personal use*, then at the "choose your Gmail address"
step click the small **"Use your existing email instead"** link and enter the `@pplsolutionsinc.com`
address. Google emails a verification code to the normal mailbox; enter it, set a password, done.

**No Gmail inbox is created. No Google Workspace licence is needed. Microsoft 365 mail is not
touched in any way** — mail flow, MX, SPF and DNS all stay exactly as they are. The only new thing
is a Google login that happens to use a .ppl address.

### The four steps, in order

**1 — Whoever will use the reports** *(suggest Joey, plus one other person so it is never one-deep)*
Create a Google account on your `@pplsolutionsinc.com` address, as above. Tell us the addresses once
they exist.

**2 — Gilbert**
Add those accounts to Google Analytics as **Administrators** on the `pplsolutionsinc.com` property,
so .ppl can manage its own users from then on.

**3 — Rafael** *(this is the only part that needs you)*
Add one `TXT` record in Cloudflare so that .ppl owns Search Console **outright** rather than as a
guest on Gilbert's verification. Search Console will generate the exact value — it looks like
`google-site-verification=…`. Two of these already exist on the domain and more can coexist safely;
this one simply gets added alongside them.

Worth doing properly: Search Console has **no "transfer property" button**. Verifying independently
is the only way .ppl's access survives Gilbert's account being removed. The quicker alternative —
Gilbert simply adds people as users — works fine day to day but leaves every one of those people
dependent on his verification staying in place.

**4 — Everyone, before anything is removed**
Confirm the new accounts can actually sign in and see data. **Only then** is Gilbert's personal
access removed. Doing step 4 before it is confirmed is how an account ends up with no working
administrator, so we will not skip it.

### Two things we noticed in your DNS while preparing this

Neither is a problem. Both are things somebody should be able to account for:

- **There are two Google verification records on the domain, not one.** Only one is Gilbert's. The
  other is most likely left over from the WordPress site or a previous agency — but because this is
  a domain-level property, whoever holds it may also have owner access to Search Console. **Does
  anyone recognise it?**
- **There is an `ahrefs-site-verification` record**, meaning the domain is verified in Ahrefs, an
  SEO tool. Nobody on the current side of the project set that up. Same question — **is this a
  subscription .ppl is paying for, and does anyone still have the login?**

If neither is recognised, we would suggest removing them, but we will not touch anything until you
confirm.

---

## Where things stand

| | Status |
|---|---|
| Website live on www.pplsolutionsinc.com | ✅ Live since 4 August |
| Contact and careers form emails | ✅ Working — `sales@` and `careers@` |
| Server access and security | ✅ Resolved |
| Domain switchover | ✅ Done |
| CRM account and sales pipeline | ✅ Set up |
| Logging email replies against customer records | ⚪ Optional — needs Request 1 above |
| Google Analytics collecting traffic data | ✅ Live since 7 August |
| Analytics and Search Console owned by .ppl | ⚪ Needs Request 2 above |

Happy to jump on a quick call for any of this.
