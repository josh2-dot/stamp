import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

type EyebrowElement = "p" | "span" | "label" | "div" | "dt";

type EyebrowProps<E extends EyebrowElement = "p"> = {
  as?: E;
  align?: "left" | "center";
  /** Use the brand orange instead of muted (for accent moments) */
  accent?: boolean;
} & Omit<ComponentPropsWithoutRef<E>, "as">;

/**
 * The single source of truth for "uppercase, letterspaced, muted, xs" eyebrow text.
 *
 * Replaces the old CardLabel + ad-hoc tracking values (0.18em, 0.20em, 0.25em, 0.30em)
 * scattered across the codebase. Pick this every time you reach for that pattern.
 *
 * Default tag is <p>; pass `as="label"` (with htmlFor) for form labels,
 * `as="span"` when nesting inside other text, etc.
 */
export function Eyebrow<E extends EyebrowElement = "p">({
  as,
  align = "left",
  accent = false,
  className,
  children,
  ...rest
}: EyebrowProps<E>) {
  const Tag = (as ?? "p") as ElementType;
  return (
    <Tag
      className={cn(
        "text-xs uppercase tracking-[0.2em] font-medium",
        accent ? "text-stamp-orange" : "text-stamp-muted",
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
