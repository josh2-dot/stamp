import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = hint || error ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        // Was: tracking-[0.18em] (one of three off-pattern values the audit
        // called out). Eyebrow is now the single source of truth for this
        // uppercase-letterspaced-muted-xs pattern.
        <Eyebrow as="label" htmlFor={inputId} className="mb-2 block">
          {label}
        </Eyebrow>
      )}

      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-stamp-surface2",
          "transition-colors duration-150 px-3.5 py-2.5",
          // Focus intensity: /50 (per DESIGN.md "focused, not selected").
          // Selection state at full orange is reserved for SelectableCard.
          error
            ? "border-stamp-red/60 focus-within:border-stamp-red"
            : "border-stamp-border focus-within:border-stamp-orange/50",
        )}
      >
        {prefix && <span className="text-stamp-muted-2 text-sm shrink-0">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={hintId}
          aria-invalid={!!error}
          className={cn(
            "flex-1 bg-transparent text-stamp-white placeholder:text-stamp-muted",
            "outline-none text-sm w-full min-w-0",
            className,
          )}
          {...rest}
        />
        {suffix && <span className="text-stamp-muted-2 text-sm shrink-0">{suffix}</span>}
      </div>

      {(hint || error) && (
        <p
          id={hintId}
          className={cn(
            "mt-1.5 text-xs",
            // Hints are 14px-tier secondary body text → muted-2 (passes AA).
            // The old `text-stamp-muted` failed AA at this scale on stamp-black.
            error ? "text-stamp-red" : "text-stamp-muted-2",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});
