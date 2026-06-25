import { Card, CardLabel } from "@/components/ui/Card";
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
        <CardLabel>Tiers</CardLabel>
        <span className="text-xs text-stamp-muted">{tiers.length} tiers</span>
      </div>

      <div className="space-y-5">
        {tiers.map((t) => {
          const pct = Math.min(100, (t.sold / t.capacity) * 100);
          const soldOut = t.sold >= t.capacity;
          return (
            <div key={t.id}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-medium truncate">{t.name}</span>
                  <span className="text-xs text-stamp-muted shrink-0">
                    {formatNaira(t.price + t.service_fee)}
                  </span>
                </div>
                <span className="text-sm text-stamp-muted shrink-0">
                  <span className="text-stamp-white font-medium">{t.sold}</span>
                  {" / "}
                  {t.capacity}
                </span>
              </div>
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
