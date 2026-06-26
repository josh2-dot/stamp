import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Apply the brand orange glow shadow — reserved for the single highest-intent
   * CTA on a page (Hero "Start selling", checkout "Pay", dashboard "+ New event",
   * etc). When every primary glows, none of them do.
   */
  glow?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-md " +
  "transition-all duration-150 select-none whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-stamp-black disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-stamp-orange text-stamp-black hover:bg-stamp-orange/90 " +
    "focus-visible:ring-stamp-orange active:translate-y-px",
  secondary:
    "bg-stamp-surface2 text-stamp-white border border-stamp-border " +
    "hover:bg-stamp-surface2/70 hover:border-stamp-muted/50 " +
    "focus-visible:ring-stamp-muted",
  ghost:
    "bg-transparent text-stamp-white hover:bg-stamp-surface " +
    "focus-visible:ring-stamp-muted",
  danger:
    "bg-stamp-red text-stamp-white hover:bg-stamp-red/90 " +
    "focus-visible:ring-stamp-red",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    glow = false,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        glow && variant === "primary" && "shadow-stamp-glow",
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
