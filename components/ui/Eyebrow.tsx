import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  align?: "left" | "center";
  /** Use the brand orange instead of muted (for accent moments) */
  accent?: boolean;
}

/**
 * The single source of truth for "uppercase, letterspaced, muted, xs" eyebrow text.
 *
 * Replaces the old CardLabel + ad-hoc tracking values (0.18em, 0.20em, 0.25em, 0.30em)
 * scattered across the codebase. Pick this every time you reach for that pattern.
 */
export function Eyebrow({
  align = "left",
  accent = false,
  className,
  children,
  ...rest
}: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-xs uppercase tracking-[0.2em] font-medium",
        accent ? "text-stamp-orange" : "text-stamp-muted",
        align === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}
