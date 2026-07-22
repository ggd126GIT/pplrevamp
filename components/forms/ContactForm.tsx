"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Textarea, Honeypot } from "./fields";
import { HONEYPOT_FIELD } from "@/lib/forms";
import { getSessionId } from "@/lib/analytics/session";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = {
      ...Object.fromEntries(new FormData(form).entries()),
      sessionId: getSessionId(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-purple/20 bg-mist p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-purple" />
        <h3 className="mt-4 text-xl font-bold text-ink">Message sent!</h3>
        <p className="mt-2 text-charcoal/75">
          Thank you for contacting us. One of our .ppl will get back to you
          regarding your inquiry.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Honeypot name={HONEYPOT_FIELD} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" required>
          <TextInput id="firstName" name="firstName" autoComplete="given-name" required />
        </Field>
        <Field label="Last name" htmlFor="lastName" required>
          <TextInput id="lastName" name="lastName" autoComplete="family-name" required />
        </Field>
        <Field label="Company name" htmlFor="company">
          <TextInput id="company" name="company" autoComplete="organization" />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <TextInput id="designation" name="designation" autoComplete="organization-title" />
        </Field>
        <Field label="Company email" htmlFor="email" required>
          <TextInput id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone number" htmlFor="phone">
          <TextInput id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field label="Message" htmlFor="message" required>
        <Textarea id="message" name="message" required placeholder="How can we help power your business strategies?" />
      </Field>

      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}
