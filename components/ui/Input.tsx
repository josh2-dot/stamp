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
        <Eyebrow as="label" htmlFor={inputId} className="mb-2 block">
          {label}
        </Eyebrow>
      )}

      <div
        className={cn(
          // Inputs read as *pressed into* the paper — deeper cream fill,
          // warm inset well shadow. The focus state pulls the ink border
          // taut without recoloring the fill.
          "flex items-center gap-2 rounded-md bg-stamp-surface2",
          "shadow-stamp-well transition-[box-shadow,border-color] duration-150",
          // Mobile tap targets need ≥44px. Bump py + min-height on mobile,
          // return to tighter desktop density on ≥sm.
          "border border-transparent px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0",
          error
            ? "!border-stamp-red/60 focus-within:!border-stamp-red"
            : "focus-within:border-stamp-white/40 focus-within:shadow-[inset_0_1px_2px_rgba(74,68,50,0.14),inset_0_0_0_1px_rgba(20,16,12,0.35)]",
        )}
      >
        {prefix && <span className="text-stamp-muted-2 text-base sm:text-sm shrink-0">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={hintId}
          aria-invalid={!!error}
          className={cn(
            "flex-1 bg-transparent text-stamp-white placeholder:text-stamp-muted",
            // 16px on mobile prevents iOS auto-zoom on focus. text-sm returns
            // on ≥sm where zoom isn't a concern.
            "outline-none text-base sm:text-sm w-full min-w-0",
            className,
          )}
          {...rest}
        />
        {suffix && <span className="text-stamp-muted-2 text-base sm:text-sm shrink-0">{suffix}</span>}
      </div>

      {(hint || error) && (
        <p
          id={hintId}
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-stamp-red" : "text-stamp-muted-2",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});