import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

type EyebrowElement = "p" | "span" | "label" | "div" | "dt";

type Tone = "muted" | "accent" | "warning" | "success" | "danger";

type EyebrowProps<E extends EyebrowElement = "p"> = {
  as?: E;
  align?: "left" | "center";
  /**
   * Ink pigment. Defaults to "muted" (subdued metadata).
   *   accent  — vermillion, for focal moments
   *   warning — ochre, paired with tone="warning" Cards
   *   success — forest green, paired with tone="success" Cards
   *   danger  — bordeaux, for error eyebrows
   */
  tone?: Tone;
  /** @deprecated use tone="accent" instead. Kept for back-compat. */
  accent?: boolean;
} & Omit<ComponentPropsWithoutRef<E>, "as">;

const toneColor: Record<Tone, string> = {
  muted:   "text-stamp-muted",
  accent:  "text-stamp-orange",
  warning: "text-stamp-gold",
  success: "text-stamp-green",
  danger:  "text-stamp-red",
};

/**
 * The single source of truth for eyebrow labels.
 *
 * Editorial refinement: the accent eyebrow now paints the leading
 * bracket as a small vermillion square, echoing the classification
 * marks on Badge. Everything else is the same uppercase / tracked
 * xs pattern, tightened by a hair (0.18em → cleaner on Inter Tight).
 */
export function Eyebrow<E extends EyebrowElement = "p">({
  as,
  align = "left",
  tone,
  accent = false,
  className,
  children,
  ...rest
}: EyebrowProps<E>) {
  const Tag = (as ?? "p") as ElementType;
  const resolvedTone: Tone = tone ?? (accent ? "accent" : "muted");
  return (
    <Tag
      className={cn(
        // 11px, tighter tracking, semibold — reads as a printed caption
        // label rather than a soft eyebrow. The uppercase small-caps
        // treatment on Inter Tight is crisper than what DM Sans gave us.
        "inline-flex items-center gap-2 text-[11px] uppercase font-semibold",
        "tracking-[0.18em] leading-none",
        toneColor[resolvedTone],
        align === "center" && "justify-center w-full",
        className,
      )}
      {...rest}
    >
      {/* Bracket mark — a 6px filled square that anchors the eyebrow
          to a specific pigment. Muted tone gets a hollow one instead;
          the pigment moments earn the filled mark. */}
      <span
        aria-hidden="true"
        className={cn(
          "inline-block w-[6px] h-[6px] shrink-0",
          resolvedTone === "muted"
            ? "border border-current"
            : "bg-current",
        )}
      />
      <span>{children}</span>
    </Tag>
  );
}
