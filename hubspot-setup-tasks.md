# HubSpot Setup — Task Spec for Claude Code (Playwright MCP)

**Goal:** Configure a HubSpot CRM account for `.ppl Solutions, Inc.` (BPO / offshoring, B2B) using ONLY free-tier-safe features. Drive the browser via the Playwright MCP. Verify each step before moving on.

**Account state:** Logged in. A 14-day Marketing Hub Professional trial is currently active. Base URL region is `app-na2.hubspot.com`.

---

## CRITICAL GUARDRAILS — read before doing anything

1. **Free-tier only.** A Pro trial is live, but everything configured here must survive the trial ending. Do NOT build or enable any Pro-only feature: no multi-step workflows, no branching automation, no sequences, no branding removal, no custom reporting. If a screen offers "Upgrade" or gates a feature behind Pro/Starter, skip it.
2. **Ignore the trial onboarding guide.** If the `trial-guide` checklist or upgrade prompts appear, dismiss/close them and navigate to the real CRM via the top nav. Do not follow the guided-setup wizard.
3. **Never enter payment/card details.** If any step asks for billing info to proceed, STOP and report back — do not continue that step.
4. **Navigate by visible labels, not hard-coded selectors.** HubSpot's DOM changes often. Prefer clicking on visible text ("Settings", "Deals", "Pipelines", etc.). If a label isn't found, take a snapshot and report what's on screen rather than guessing.
5. **Verify after every step.** Confirm the change is saved and visible before proceeding. Report a short PASS/description per step.

---

## STEP 1 — Set up the deal pipeline (3Ds sales motion)

**Why:** The pipeline is the backbone every lead flows into. Free tier allows exactly ONE pipeline — configure it well.

**Navigate:**
- Click the **Settings** gear icon (top right).
- Left sidebar: **Data Management → Objects → Deals**.
- Open the **Pipelines** tab.
- Ensure the pipeline selector shows the default pipeline (do NOT try to create a second pipeline — free tier is capped at one).

**Do:** Rename the existing stages (and add/remove so the final ordered set is exactly this). Edit stage labels in place; use the existing stages where possible rather than deleting everything.

Target stages, in order:
1. `New Lead`
2. `Consultation Booked`
3. `Discover`
4. `Design`
5. `Deliver`
6. `Won` (mark as a won/closed stage)
7. `Lost` (mark as a lost/closed stage)

Leave win-probability at defaults. Save.

**Verify:** Re-open the Deals pipeline view and confirm all seven stages appear in the correct order with correct spelling.

---

## STEP 2 — Basic account/company info

**Navigate:** **Settings → Account Setup → Account Defaults** (or "Account Management → Defaults").

**Do:**
- Company name: `.ppl Solutions, Inc.`
- Set the correct **time zone** and **date format** for the team (Philippines — GMT+8 — unless instructed otherwise).
- Currency: confirm/set to the primary billing currency (ask if unknown — likely USD given US-facing clients).

**Verify:** Settings reflect the saved values.

---

## STEP 3 — Create the lead-capture form (destination for the website form)

**Why:** This HubSpot form is NOT meant to be embedded on the site. It exists so the custom Next.js contact form can POST leads into HubSpot via the Forms API. We just need it created so we can grab its IDs.

**Navigate:** Top nav → **Marketing → Forms** (or **CRM → Forms** depending on layout) → **Create form**.

**Do:**
- Choose a plain/blank **Embedded** form (regular form, not pop-up).
- Name it: `Website Contact Form (API)`.
- Fields to include (match the site's contact form): `First name`, `Last name` (or single `Full name`), `Email` (required), `Phone`, `Company name`, `Message` (single-line or multi-line text).
- Do NOT enable any Pro-gated options. Skip multi-step logic.
- Publish/save the form.

**Verify + REPORT BACK the two values needed for the API integration:**
- **Portal ID (Hub ID)** — visible top-right of the account menu, or in the form embed code.
- **Form GUID** — found in the form's embed/share code (the `formId` value) or the form URL.

Output both clearly, e.g.:
```
PORTAL_ID: 246980736
FORM_GUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## STEP 4 — Single-step form follow-up (the ONLY automation on free tier)

**Why:** Free tier permits one simple auto-reply email after a form submission. This is safe and survives the trial.

**Navigate:** Open the form created in Step 3 → **Follow-up** (or **Automation**) tab.

**Do:**
- Enable a simple follow-up email to the person who submitted.
- Subject: `Thanks for reaching out to .ppl Solutions`
- Body (short, professional): confirm receipt and that a team member will be in touch shortly re: their consultation request.
- This must be a SINGLE follow-up email only. If HubSpot tries to route this into a multi-step workflow (Pro), STOP and use the basic single-email follow-up instead.

**Verify:** Follow-up is toggled on and shows a single email action.

---

## STEP 5 — (MANUAL — do NOT automate) Connect team email

**Why:** Connecting Gmail/Outlook logs conversations against contacts. BUT this requires OAuth login + likely 2FA into a Google/Microsoft account.

**⚠️ Do NOT attempt to drive this with the browser agent** — it involves entering real account credentials and a 2FA challenge. Instead:
- Navigate to **Settings → General → Email → Connect personal email** and STOP there.
- Report back that the screen is ready, and leave the actual OAuth login for the human (GG) to complete manually.

---

## FINAL REPORT

After completing steps 1–4 (and staging step 5), output a summary:
- PASS/FAIL per step
- The `PORTAL_ID` and `FORM_GUID` from Step 3
- Any screen where an upgrade/paywall was encountered and skipped
- Anything that needs GG's manual attention

Do not enable, purchase, or trial-activate anything beyond the above.
