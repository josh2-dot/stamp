import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "warning" | "danger" | "accent" | "gold";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const tones: Record<Tone, string> = {
  default: "bg-stamp-surface2 text-stamp-muted border-stamp-border",
  success: "bg-stamp-green/10 text-stamp-green border-stamp-green/30",
  warning: "bg-stamp-gold/10 text-stamp-gold border-stamp-gold/30",
  danger: "bg-stamp-red/10 text-stamp-red border-stamp-red/30",
  accent: "bg-stamp-orange/10 text-stamp-orange border-stamp-orange/30",
  gold: "bg-stamp-gold/15 text-stamp-gold border-stamp-gold/40",
};

const dotColors: Record<Tone, string> = {
  default: "bg-stamp-muted",
  success: "bg-stamp-green",
  warning: "bg-stamp-gold",
  danger: "bg-stamp-red",
  accent: "bg-stamp-orange",
  gold: "bg-stamp-gold",
};

export function Badge({
  tone = "default",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full",
        "border text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full",
            dotColors[tone],
            tone === "success" && "animate-stamp-pulse",
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
