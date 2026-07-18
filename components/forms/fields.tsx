import { cn } from "@/lib/cn";

export const controlClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-charcoal/40 transition-colors focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20";

export function Field({
  label,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-charcoal"
      >
        {label}
        {required && <span className="ml-0.5 text-purple">*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(controlClass, "min-h-32 resize-y", props.className)}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(controlClass, "appearance-none pr-10", props.className)}
    />
  );
}

/** Visually-hidden honeypot input for spam bots. */
export function Honeypot({ name }: { name: string }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-[-9999px]" >
      <label htmlFor={name}>Leave this field empty</label>
      <input
        id={name}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
