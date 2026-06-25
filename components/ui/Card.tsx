import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a thin accent line at the top — useful for highlighting */
  accent?: boolean;
  /** Use elevated background (surface2) */
  elevated?: boolean;
  /** Make the border interactive for click-targets */
  interactive?: boolean;
}

export function Card({
  accent = false,
  elevated = false,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-stamp-border p-5",
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

export function CardLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs uppercase tracking-[0.25em] text-stamp-muted font-medium",
        className,
      )}
    >
      {children}
    </p>
  );
}
