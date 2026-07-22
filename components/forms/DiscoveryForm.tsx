"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Field, TextInput, Textarea, Select, Honeypot } from "./fields";
import { HONEYPOT_FIELD } from "@/lib/forms";
import { getSessionId } from "@/lib/analytics/session";

type Status = "idle" | "submitting" | "success" | "error";

const industries = [
  "Financial Services / Banking / Insurance",
  "Consumer & Retail / e-Commerce",
  "Manufacturing",
  "Energy",
  "Healthcare",
  "Technology / Software / IT",
  "Telecommunications",
  "Other",
];

const sizes = ["1–50", "51–200", "201–1,000", "1,000+"];
const models = ["Outsourcing", "Offshoring", "Not sure yet"];
const timelines = ["Immediately", "1–3 months", "3–6 months", "Just exploring"];

const initial = {
  company: "",
  industry: "",
  industryOther: "",
  companySize: "",
  model: "",
  services: "",
  teamSize: "",
  timeline: "",
  fullName: "",
  designation: "",
  email: "",
  phone: "",
  goals: "",
  [HONEYPOT_FIELD]: "",
};

const stepLabels = ["Company", "Engagement", "Your details"];

export function DiscoveryForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof initial) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setData((d) => ({ ...d, [key]: e.target.value }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

  const canAdvance =
    step === 0
      ? true
      : step === 1
        ? true
        : data.fullName.trim().length > 0 && emailValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    setStatus("submitting");
    setError(null);

    const payload = {
      ...data,
      industry:
        data.industry === "Other" && data.industryOther
          ? data.industryOther
          : data.industry,
      sessionId: getSessionId(),
    };

    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-purple/20 bg-mist p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-purple" />
        <h3 className="mt-4 text-xl font-bold text-ink">Request received!</h3>
        <p className="mt-2 text-charcoal/75">
          Thank you for reaching out. One of our .ppl will get back to you to
          schedule your discovery consultation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Honeypot name={HONEYPOT_FIELD} />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i <= step ? "bg-purple text-white" : "bg-black/[0.06] text-charcoal/50",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === step ? "text-purple" : "text-charcoal/50",
              )}
            >
              {label}
            </span>
            {i < stepLabels.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  i < step ? "bg-purple" : "bg-black/[0.08]",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-5">
          <Field label="Company name" htmlFor="d-company">
            <TextInput id="d-company" value={data.company} onChange={set("company")} />
          </Field>
          <Field label="Industry" htmlFor="d-industry">
            <Select id="d-industry" value={data.industry} onChange={set("industry")}>
              <option value="">Select an industry…</option>
              {industries.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </Select>
          </Field>
          {data.industry === "Other" && (
            <Field label="Please specify your industry" htmlFor="d-industry-other">
              <TextInput
                id="d-industry-other"
                value={data.industryOther}
                onChange={set("industryOther")}
              />
            </Field>
          )}
          <Field label="Company size" htmlFor="d-size">
            <Select id="d-size" value={data.companySize} onChange={set("companySize")}>
              <option value="">Select company size…</option>
              {sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-5">
          <Field label="Which model are you considering?" htmlFor="d-model">
            <Select id="d-model" value={data.model} onChange={set("model")}>
              <option value="">Select a model…</option>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Which services are you interested in?" htmlFor="d-services">
            <TextInput
              id="d-services"
              value={data.services}
              onChange={set("services")}
              placeholder="e.g. Customer Service, Finance & Accounting"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Estimated team size" htmlFor="d-team">
              <TextInput
                id="d-team"
                value={data.teamSize}
                onChange={set("teamSize")}
                placeholder="e.g. 10"
              />
            </Field>
            <Field label="Timeline" htmlFor="d-timeline">
              <Select id="d-timeline" value={data.timeline} onChange={set("timeline")}>
                <option value="">Select timeline…</option>
                {timelines.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="d-name" required>
              <TextInput id="d-name" value={data.fullName} onChange={set("fullName")} required />
            </Field>
            <Field label="Designation" htmlFor="d-designation">
              <TextInput id="d-designation" value={data.designation} onChange={set("designation")} />
            </Field>
            <Field label="Email" htmlFor="d-email" required>
              <TextInput id="d-email" type="email" value={data.email} onChange={set("email")} required />
            </Field>
            <Field label="Phone number" htmlFor="d-phone">
              <TextInput id="d-phone" type="tel" value={data.phone} onChange={set("phone")} />
            </Field>
          </div>
          <Field label="Tell us about your goals" htmlFor="d-goals">
            <Textarea id="d-goals" value={data.goals} onChange={set("goals")} />
          </Field>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/70 hover:text-purple"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : (
          <span />
        )}

        <Button type="submit" disabled={!canAdvance || status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Sending…
            </>
          ) : step < 2 ? (
            <>
              Next <ArrowRight className="size-4" />
            </>
          ) : (
            "Request Consultation"
          )}
        </Button>
      </div>
    </form>
  );
}
