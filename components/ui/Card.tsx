import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";

type Tone = "default" | "warning" | "success" | "danger" | "accent";

interface SharedCardProps {
  /** Add a thin orange "stamp impression" line at the top */
  accent?: boolean;
  /** Use elevated background (surface2) */
  elevated?: boolean;
  /** Border tone — replaces ad-hoc border-color overrides */
  tone?: Tone;
  className?: string;
  children?: ReactNode;
}

const toneBorder: Record<Tone, string> = {
  default: "border-stamp-border",
  warning: "border-stamp-gold/40",
  success: "border-stamp-green/40",
  danger: "border-stamp-red/40",
  accent: "border-stamp-orange/40",
};

// ============================================================
// <Card>  — div surface
// ============================================================

interface DivCardProps extends SharedCardProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Marks the card as click-targetable (cursor + hover border) */
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
        "shadow-stamp-card",
        interactive &&
          "transition-colors duration-150 cursor-pointer hover:border-stamp-muted/40",
        className,
      )}
      {...rest}
    >
      {accent && (
        <div
          className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-stamp-orange to-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

// ============================================================
// <SelectableCard> — button surface for selectable tiles
//   (tier picker, option list, etc.)
// ============================================================

interface SelectableCardProps
  extends SharedCardProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected?: boolean;
  /** Renders the card in a "sold out" visual state and disables it */
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
          "relative w-full text-left rounded-lg border p-5 transition-colors duration-150",
          "shadow-stamp-card focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-stamp-orange focus-visible:ring-offset-2",
          "focus-visible:ring-offset-stamp-black",
          // Background
          selected || elevated ? "bg-stamp-surface2" : "bg-stamp-surface",
          // Border
          selected
            ? "border-stamp-orange"
            : soldOut
              ? toneBorder.default
              : toneBorder[tone],
          // States
          soldOut && "opacity-50 cursor-not-allowed",
          !isDisabled && !selected && "hover:border-stamp-muted/40 cursor-pointer",
          className,
        )}
        {...rest}
      >
        {accent && !selected && (
          <div
            className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-stamp-orange to-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

// ============================================================
// Backward-compat: CardLabel = Eyebrow (align left).
// Existing call sites continue to work; Pass B will sweep imports
// to use <Eyebrow> directly.
// ============================================================

export function CardLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Eyebrow className={className}>{children}</Eyebrow>;
}
