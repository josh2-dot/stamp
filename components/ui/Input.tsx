import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

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
        <label
          htmlFor={inputId}
          className="block text-xs uppercase tracking-[0.18em] text-stamp-muted font-medium mb-2"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-stamp-surface2",
          "transition-colors duration-150 px-3.5 py-2.5",
          error
            ? "border-stamp-red/60 focus-within:border-stamp-red"
            : "border-stamp-border focus-within:border-stamp-orange/60",
        )}
      >
        {prefix && <span className="text-stamp-muted text-sm shrink-0">{prefix}</span>}
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
        {suffix && <span className="text-stamp-muted text-sm shrink-0">{suffix}</span>}
      </div>

      {(hint || error) && (
        <p
          id={hintId}
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-stamp-red" : "text-stamp-muted",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});
