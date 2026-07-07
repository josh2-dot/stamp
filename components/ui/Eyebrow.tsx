import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

type EyebrowElement = "p" | "span" | "label" | "div" | "dt";

type Tone = "muted" | "accent" | "warning" | "success" | "danger";

type EyebrowProps<E extends EyebrowElement = "p"> = {
  as?: E;
  align?: "left" | "center";
  /**
   * Color tone. Defaults to "muted" (subdued metadata).
   *   accent  — brand orange, for focal moments
   *   warning — gold, paired with tone="warning" Cards
   *   success — green, paired with tone="success" Cards
   *   danger  — red, for error eyebrows
   *
   * Replaces the old `accent` boolean + ad-hoc `!text-stamp-gold` overrides.
   */
  tone?: Tone;
  /** @deprecated use tone="accent" instead. Kept for back-compat. */
  accent?: boolean;
} & Omit<ComponentPropsWithoutRef<E>, "as">;

const toneColor: Record<Tone, string> = {
  muted: "text-stamp-muted",
  accent: "text-stamp-orange",
  warning: "text-stamp-gold",
  success: "text-stamp-green",
  danger: "text-stamp-red",
};

/**
 * The single source of truth for "uppercase, letterspaced, xs" eyebrow text.
 *
 * Replaces the old CardLabel + ad-hoc tracking values (0.18em, 0.20em, 0.25em,
 * 0.30em) and the `!text-stamp-gold` className escape that snuck back in on
 * the event dashboard's "Event deactivated" Card.
 *
 * Default tag is <p>; pass `as="label"` (with htmlFor) for form labels,
 * `as="span"` when nesting inside other text, etc.
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
  // Back-compat: `accent={true}` still maps to tone="accent" when tone isn't set.
  const resolvedTone: Tone = tone ?? (accent ? "accent" : "muted");
  return (
    <Tag
      className={cn(
        "text-xs uppercase tracking-[0.2em] font-medium",
        toneColor[resolvedTone],
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
