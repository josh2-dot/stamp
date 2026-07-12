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
   * Adds the vermillion halo + inset ink line to the primary variant.
   * Reserved for the single highest-intent CTA on a page. When every
   * primary glows, none of them do — that rule holds on cream too.
   */
  glow?: boolean;
}

// Base — a slightly heavier press feel than before. `translate-y-px` on
// active gives the tactile "stamped into paper" cue on primary; the
// tighter radius (6px, matching DEFAULT) reads as printed matter
// rather than a soft chip.
const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md " +
  "transition-[transform,background-color,box-shadow,border-color] duration-150 " +
  "select-none whitespace-nowrap will-change-transform " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-stamp-black " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";

const variants: Record<Variant, string> = {
  // Vermillion CTA — cream text is the "stamped" ink read. The
  // inset hairline at the bottom gives it a physical lip, so the
  // active:translate-y-px feels earned.
  primary:
    "bg-stamp-orange text-stamp-black " +
    "shadow-[inset_0_-1px_0_rgba(20,16,12,0.35)] " +
    "hover:bg-[#B32E17] " +
    "active:translate-y-px active:shadow-[inset_0_-1px_0_rgba(20,16,12,0.5)] " +
    "focus-visible:ring-stamp-orange",
  // Secondary — outlined ink on paper. No fill. The hover deepens
  // the border instead of lightening the fill; feels editorial.
  secondary:
    "bg-transparent text-stamp-white border border-stamp-white/40 " +
    "hover:border-stamp-white hover:bg-stamp-white/[0.04] " +
    "active:translate-y-px " +
    "focus-visible:ring-stamp-white/50",
  // Ghost — no border, faint underline on hover. Used for tertiary
  // affordances that shouldn't compete with the primary.
  ghost:
    "bg-transparent text-stamp-white/80 " +
    "hover:text-stamp-white hover:bg-stamp-surface " +
    "focus-visible:ring-stamp-white/30",
  // Danger — bordeaux fill, cream text. Same physical press as primary.
  danger:
    "bg-stamp-red text-stamp-black " +
    "shadow-[inset_0_-1px_0_rgba(20,16,12,0.35)] " +
    "hover:bg-[#671915] " +
    "active:translate-y-px " +
    "focus-visible:ring-stamp-red",
};

// Sizes — mobile-first tap targets. Every size ≥44px vertical on mobile;
// density tightens on ≥sm where pointer precision doesn't miss.
const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2.5 sm:py-1.5 text-sm min-h-[44px] sm:min-h-0",
  md: "px-5 py-3 sm:py-2.5 text-sm min-h-[48px] sm:min-h-0",
  lg: "px-7 py-3.5 text-base min-h-[52px] sm:min-h-0",
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
        // Glow — only when explicitly opted in AND variant is primary.
        // Silently no-ops on secondary/ghost/danger, so scoped call
        // sites can't accidentally halo the wrong CTA.
        glow && variant === "primary" && "shadow-stamp-glow hover:shadow-stamp-glow",
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
