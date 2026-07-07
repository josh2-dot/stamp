import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "warning" | "success" | "danger" | "accent";

interface SharedCardProps {
  /**
   * Adds the "stamp impression" — a rotated vermillion seal ghost in
   * the top-right corner, plus a thin vermillion top-rule. Still ≤ 1
   * per viewport per DESIGN.md; the visual weight is louder now that
   * it carries a mark and not just a hairline.
   */
  accent?: boolean;
  /** Use the second cream tier as the surface — deeper well feel. */
  elevated?: boolean;
  /** Border tone — semantic states, unchanged API. */
  tone?: Tone;
  className?: string;
  children?: ReactNode;
}

// Border colors — warmer, deeper, more editorial. The old /40 alpha
// stops don't land well on cream (they read washed-out) so the tone
// borders are opaque hex tuned against the paper.
const toneBorder: Record<Tone, string> = {
  default: "border-stamp-border",
  warning: "border-[#B98E3B]",
  success: "border-[#4A7A5F]",
  danger:  "border-[#9A3C39]",
  accent:  "border-[#D06148]",
};

// ============================================================
// <Card> — passive surface
// ============================================================

interface DivCardProps extends SharedCardProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Adds cursor pointer + a hover border shift for click-through cards. */
  interactive?: boolean;
}

export function Card({
  accent = false,
  elevated = false,
  tone = "default",
  interactive = false,
  className,
  children,
  ...rest
}: DivCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-5",
        toneBorder[tone],
        elevated ? "bg-stamp-surface2" : "bg-stamp-surface",
        // Warm shadow — no black. Adds the "sitting on paper" lift
        // without the digital-flat feel of a hard drop.
        "shadow-stamp-card",
        interactive &&
          "transition-[border-color,transform,box-shadow] duration-200 cursor-pointer " +
          "hover:border-stamp-white/50 hover:-translate-y-0.5",
        // Extra top padding when accent is on, to make room for the
        // rule + mark without cramping the eyebrow beneath.
        accent && "pt-6",
        className,
      )}
      {...rest}
    >
      {accent && <AccentImpression />}
      {children}
    </div>
  );
}

// ============================================================
// <SelectableCard> — button surface for tier / option picking
// ============================================================

interface SelectableCardProps
  extends SharedCardProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected?: boolean;
  /** Sold-out state — visual dim + disables interaction. */
  soldOut?: boolean;
}

export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(
  function SelectableCard(
    {
      accent = false,
      elevated = false,
      tone = "default",
      selected = false,
      soldOut = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || soldOut;
    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-pressed={selected}
        className={cn(
          "relative w-full text-left rounded-lg border p-5 transition-[border-color,background-color,transform] duration-200",
          "shadow-stamp-card focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-stamp-orange focus-visible:ring-offset-2",
          "focus-visible:ring-offset-stamp-black",
          // Background — selected + elevated share the deeper cream.
          selected || elevated ? "bg-stamp-surface2" : "bg-stamp-surface",
          // Border — selected wins over tone; sold-out defers to default.
          selected
            ? "border-stamp-orange"
            : soldOut
              ? toneBorder.default
              : toneBorder[tone],
          soldOut && "opacity-45 cursor-not-allowed",
          !isDisabled && !selected &&
            "hover:border-stamp-white/40 hover:-translate-y-0.5 cursor-pointer",
          // Selected also gets a subtle ring above the border so the
          // stamped feel carries through — like a wax seal locking it in.
          selected && "ring-2 ring-stamp-orange/20 ring-offset-0",
          accent && "pt-6",
          className,
        )}
        {...rest}
      >
        {accent && !selected && <AccentImpression />}
        {children}
      </button>
    );
  },
);

// ============================================================
// AccentImpression — the shared visual mark for accent Cards
// ============================================================
/**
 * The accent treatment. Two elements:
 *  - a vermillion rule across the top-inset, tapered at both ends
 *  - a rotated seal ghost in the top-right corner at 8% opacity
 *
 * Reads as "someone stamped this one for you." Deliberately louder
 * than the old accent hairline — the accent Card was too easy to
 * miss when it needed to be the focal surface for its viewport.
 */
function AccentImpression() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute top-0 left-5 right-5 h-[2px] bg-gradient-to-r from-transparent via-stamp-orange to-transparent"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute top-3 right-3 w-12 h-12 opacity-[0.09] -rotate-[14deg] text-stamp-orange pointer-events-none"
      >
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <text
          x="50" y="56" textAnchor="middle"
          fill="currentColor"
          fontFamily="var(--font-fraunces), serif"
          fontWeight={600} fontSize="18" letterSpacing="-0.5"
        >
          ✷
        </text>
      </svg>
    </>
  );
}
