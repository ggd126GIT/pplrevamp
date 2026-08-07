# .ppl Website — Access Requests

**To:** Rafael Dayalo · **cc:** Joey Lianko
**From:** Gilbert
**Date:** 7 August 2026 *(supersedes the 31 July version — everything it asked for is now done)*
**Summary:** The website is live. One optional permission is outstanding, and it is not urgent.

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

## The one outstanding request: approve HubSpot's email integration in Microsoft 365

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

## Where things stand

| | Status |
|---|---|
| Website live on www.pplsolutionsinc.com | ✅ Live since 4 August |
| Contact and careers form emails | ✅ Working — `sales@` and `careers@` |
| Server access and security | ✅ Resolved |
| Domain switchover | ✅ Done |
| CRM account and sales pipeline | ✅ Set up |
| Logging email replies against customer records | ⚪ Optional — needs the approval above |

Happy to jump on a quick call for any of this.
