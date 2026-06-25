import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatNaira, formatPhoneDisplay } from "@/lib/format";
import type { DashboardSnapshot } from "@/types";

interface LiveFeedProps {
  tickets: DashboardSnapshot["recentTickets"];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  });
}

export function LiveFeed({ tickets }: LiveFeedProps) {
  return (
    <Card className="flex flex-col h-[480px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardLabel>Live feed</CardLabel>
          <p className="text-xs text-stamp-muted mt-1">Recent ticket sales</p>
        </div>
        <Badge tone="success" dot>Live</Badge>
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-1">
        {tickets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stamp-muted text-sm">No sales yet.</p>
            <p className="text-stamp-muted text-xs mt-1">
              Share the event link to start selling.
            </p>
          </div>
        )}

        {tickets.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 p-3 rounded-md hover:bg-stamp-surface2 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {t.buyer_name ?? "Anonymous"}
                </span>
                {t.used && (
                  <Badge tone="success" className="!py-0">
                    Checked in
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stamp-muted mt-0.5">
                {t.tier_name} · {formatPhoneDisplay(t.buyer_phone)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium text-stamp-orange tabular-nums">
                {formatNaira(t.amount_paid)}
              </p>
              <p className="text-xs text-stamp-muted">{timeAgo(t.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
