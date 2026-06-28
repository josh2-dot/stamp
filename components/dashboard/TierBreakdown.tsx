import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { TicketTier } from "@/types";

interface TierBreakdownProps {
  tiers: TicketTier[];
}

export function TierBreakdown({ tiers }: TierBreakdownProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Tiers</Eyebrow>
        <span className="text-xs text-stamp-muted-2">{tiers.length} tiers</span>
      </div>

      <div className="space-y-5">
        {tiers.map((t) => {
          const pct = Math.min(100, (t.sold / t.capacity) * 100);
          const soldOut = t.sold >= t.capacity;
          return (
            <div key={t.id}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-medium truncate text-stamp-white">{t.name}</span>
                  {/* Organizer dashboard — show what THEY receive per ticket,
                      not what the buyer pays. Their P&L, their view. */}
                  <span className="text-xs text-stamp-muted-2 shrink-0">
                    {formatNaira(t.price)}
                  </span>
                </div>
                <span className="text-sm text-stamp-muted-2 shrink-0">
                  <span className="text-stamp-white font-medium tabular-nums">{t.sold}</span>
                  {" / "}
                  <span className="tabular-nums">{t.capacity}</span>
                </span>
              </div>
              {/* Gold here is a legitimate "running low" semantic per DESIGN.md
                  — kept as warning signal, not decoration. */}
              <div className="h-1.5 bg-stamp-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    soldOut
                      ? "bg-stamp-red"
                      : pct > 75
                        ? "bg-stamp-gold"
                        : "bg-stamp-orange",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
