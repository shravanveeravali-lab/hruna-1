import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const fieldBase =
  "w-full rounded bg-surface-low border border-outline-variant px-4 py-3 text-body-md text-ink placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label-md text-ink-variant uppercase tracking-wide">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-outline">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-[120px] resize-y", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "appearance-none bg-surface-low", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
