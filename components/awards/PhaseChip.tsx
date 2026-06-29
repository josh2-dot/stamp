import { cn } from "@/lib/cn";
import type { AwardPhase } from "@/types";

interface PhaseChipProps {
  phase: AwardPhase;
  className?: string;
}

/**
 * Phase indicator chip. Color encodes lifecycle stage rather than just
 * being decoration — gold for "needs action soon", green for "live",
 * muted for terminal, orange-tinted for in-progress.
 */
export function PhaseChip({ phase, className }: PhaseChipProps) {
  const styles: Record<AwardPhase, { label: string; classes: string; pulse?: boolean }> = {
    draft: {
      label: "Draft",
      classes: "bg-stamp-surface2 text-stamp-muted-2 border-stamp-border",
    },
    nominations_open: {
      label: "Nominations open",
      classes: "bg-stamp-green/10 text-stamp-green border-stamp-green/30",
      pulse: true,
    },
    moderation: {
      label: "Moderation",
      classes: "bg-stamp-gold/10 text-stamp-gold border-stamp-gold/30",
    },
    voting_open: {
      label: "Voting open",
      classes: "bg-stamp-orange/10 text-stamp-orange border-stamp-orange/30",
      pulse: true,
    },
    voting_closed: {
      label: "Voting closed",
      classes: "bg-stamp-gold/10 text-stamp-gold border-stamp-gold/30",
    },
    revealed: {
      label: "Revealed",
      classes: "bg-stamp-surface2 text-stamp-muted-2 border-stamp-border",
    },
  };

  const config = styles[phase];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-[0.15em] border",
        config.classes,
        className,
      )}
    >
      {config.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-stamp-pulse" />
          <span className="relative rounded-full bg-current h-1.5 w-1.5" />
        </span>
      )}
      {config.label}
    </span>
  );
}
