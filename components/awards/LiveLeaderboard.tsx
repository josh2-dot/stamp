"use client";

import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import type { AwardNominee } from "@/types";

interface LiveLeaderboardProps {
  nominees: AwardNominee[];
  totalVotes: number;
  totalRevenue: number;
  /** When true, the top entry gets the "winner" treatment (gold halo).
   *  Used on the revealed phase. */
  revealed?: boolean;
}

/**
 * Internal-facing leaderboard. Organizer's view shows exact counts and
 * revenue. The bar treatment is restrained — small horizontal accent that
 * scales with vote share — so the eye reads the numbers, not the chart.
 *
 * The public leaderboard (on /[slug]/awards) is its own component with
 * different visibility rules. This one is for the dashboard.
 */
export function LiveLeaderboard({
  nominees,
  totalVotes,
  totalRevenue,
  revealed,
}: LiveLeaderboardProps) {
  const sorted = [...nominees].sort(
    (a, b) => Number(b.votes_count) - Number(a.votes_count),
  );
  const leader = sorted[0];
  const max = leader ? Number(leader.votes_count) : 0;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <Eyebrow>Live results</Eyebrow>
        <div className="flex items-center gap-6 text-xs text-stamp-muted-2">
          <div>
            <span className="text-stamp-white tabular-nums">
              {totalVotes.toLocaleString()}
            </span>{" "}
            votes
          </div>
          <div>
            <span className="text-stamp-orange tabular-nums">
              {formatNaira(totalRevenue)}
            </span>{" "}
            revenue
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-stamp-muted-2 text-center py-8 mt-4">
          No votes yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((n, idx) => {
            const votes = Number(n.votes_count);
            const pct = max > 0 ? (votes / max) * 100 : 0;
            const isLeader = idx === 0 && votes > 0;
            const isWinner = revealed && isLeader;

            return (
              <li key={n.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isWinner ? "text-stamp-gold" : "text-stamp-muted-2"
                      }`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`truncate ${
                        isWinner
                          ? "text-stamp-gold font-medium"
                          : "text-stamp-white"
                      }`}
                    >
                      {n.display_name}
                    </span>
                    {isWinner && (
                      <Badge tone="warning" dot>
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="tabular-nums text-stamp-white">
                      {votes.toLocaleString()}
                    </span>
                    <span className="text-xs text-stamp-muted-2 ml-1">
                      ({totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                {/* Bar — minimal, sits below the row, scales to leader */}
                <div className="h-0.5 bg-stamp-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isWinner ? "bg-stamp-gold" : "bg-stamp-orange"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
