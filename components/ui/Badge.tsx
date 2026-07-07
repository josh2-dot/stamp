import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "warning" | "danger" | "accent" | "gold";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

// Tones — deeper ink pigments over cream. The alpha /10 bg trick that
// worked on dark washes out on paper; we use light tinted fills with
// a full-strength ink color and a matching border at 30%.
const tones: Record<Tone, string> = {
  default: "bg-stamp-surface2 text-stamp-muted-2 border-stamp-border",
  success: "bg-[#DCE6DA] text-[#1F4A32] border-[#4A7A5F]/50",
  warning: "bg-[#F1E4C4] text-[#7A5510] border-[#B98E3B]/50",
  danger:  "bg-[#EBD5CE] text-stamp-red border-stamp-red/40",
  accent:  "bg-[#F0D8CD] text-stamp-orange border-stamp-orange/40",
  gold:    "bg-[#EFDDB2] text-[#7A5510] border-[#B98E3B]/60",
};

// Dot colors — full-strength pigment, so the little status pip reads
// against the paper even when the pill background is soft.
const dotColors: Record<Tone, string> = {
  default: "bg-stamp-muted",
  success: "bg-stamp-green",
  warning: "bg-stamp-gold",
  danger:  "bg-stamp-red",
  accent:  "bg-stamp-orange",
  gold:    "bg-stamp-gold",
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
        // Square-shouldered rectangle, not a full pill. Reads more
        // like a stamped classification mark than a bubble.
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm",
        "border text-[11px] font-medium uppercase tracking-[0.08em]",
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
            // Default+dot combo is the "Live" ambient pulse per DESIGN.md —
            // green is reserved for gate verification and never pulses.
            tone === "default" && "animate-stamp-pulse",
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
