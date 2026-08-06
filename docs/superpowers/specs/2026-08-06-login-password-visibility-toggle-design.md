# Password visibility toggle on the staff login form

**Date:** 2026-08-06
**Status:** approved

## Why

Staff sign in with generated passwords like `Defez-Cajaw-Zekyj-47$` — 21 characters
of mixed case, digits and a symbol, usually read off a document or dictated. With
no way to see what has been typed, a mistyped character is indistinguishable from a
wrong password, and the only feedback is "Invalid login credentials".

## Scope

**One field.** `components/admin/LoginForm.tsx:53` is the only password input in
the codebase — there is no signup and no password-reset flow.

## Design

### Where the state lives

Inside `LoginForm.tsx`, which is already `"use client"`, so the toggle adds no new
client boundary.

**Not** in `components/forms/fields.tsx`. That module has no `"use client"`
directive, and `Field`, `TextInput`, `Textarea` and `Select` are consumed by
server-rendered forms. Adding a stateful `PasswordInput` there would force
`"use client"` on the file and make every form control in the project a client
component — a real cost for one reusable that currently has one caller.

### Behaviour

`const [show, setShow] = useState(false)` drives `type={show ? "text" : "password"}`.
The input sits in a `relative` wrapper with the toggle absolutely positioned at the
right; the input gains right padding so characters never run under the icon. Icons
are `Eye` / `EyeOff` from `lucide-react`, already a dependency.

**Default hidden, reset on every mount.** No persistence — a password left visible
on a shared or projected screen is worse than the problem being solved.

### The four details that actually matter

1. **`type="button"` on the toggle.** Inside a `<form>`, a button defaults to
   `submit`; without this, clicking the eye attempts a sign-in. That failure would
   present as a broken login, not a broken button.
2. **`autoComplete="current-password"` stays on the input.** Flipping `type` alone
   reveals the value; changing or dropping autocomplete would break password
   managers, which is how several staff sign in.
3. **Minimum 44×44px tap target.** The mobile audit reached **0 tap-target
   findings**; a bare icon would reintroduce one. The button carries padding to
   meet the floor.
4. **`aria-label` flipping between "Show password" and "Hide password", plus
   `aria-pressed`.** Otherwise a screen reader announces an unlabelled button. It
   remains keyboard-focusable and activates on Enter/Space as a native `<button>`.

## Verification

Vitest here runs `environment: "node"` and collects only `**/*.test.ts`, so a
`.tsx` component is not unit-testable in this setup. Verification is `tsc --noEmit`,
the full suite as a regression check, `npm run build`, and a browser pass on the
live `/login`: type a value, confirm the input `type` flips and the accessible label
changes with it, and confirm clicking the toggle does **not** submit the form.
