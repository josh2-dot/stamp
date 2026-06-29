"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { StampSeal } from "@/components/ui/StampSeal";

interface CategoryResults {
  phase: string;
  hidden: boolean;
  total_votes?: number;
  revealed_winner_id?: string | null;
  results: Array<{
    id: string;
    display_name: string;
    photo_url: string | null;
    votes_count?: number;
    percent: number;
    is_winner: boolean;
  }>;
}

interface CategoryHead {
  id: string;
  label: string;
  phase: string;
  revealed_winner_id: string | null;
}

/**
 * Projector reveal screen. Full-bleed, dark, designed to be cast on a
 * wall during the award ceremony.
 *
 * State machine:
 *   - phase=voting_open       → live leaderboard projection
 *   - phase=voting_closed     → "Counting" holding screen
 *   - phase=revealed (new)    → stamp animation plays once, then settles
 *                                on the winner
 *   - phase=revealed (returning) → settled state immediately
 *
 * Polls every 3 seconds so the screen updates when the organizer
 * advances phases from the dashboard. Once 'revealed' is detected for
 * the first time, the animation plays.
 *
 * SIGNATURE MOMENT: the stamp-as-ink reveal. The brand mark literally
 * stamps the winner's name onto the screen. This is the one place in
 * STAMP where we take a real aesthetic risk — justified because the
 * brand IS a stamp, the moment IS the climax of the show, and the
 * audience IS literally watching a wall.
 */
export default function ProjectorScreenPage() {
  const params = useParams<{ id: string; categoryId: string }>();
  const [category, setCategory] = useState<CategoryHead | null>(null);
  const [results, setResults] = useState<CategoryResults | null>(null);
  const [stampPlayed, setStampPlayed] = useState(false);
  const [showName, setShowName] = useState(false);
  const previousPhaseRef = useRef<string | null>(null);

  // Polling loop — fetches both the head + results in parallel
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const [resultsRes, headRes] = await Promise.all([
          fetch(`/api/awards/categories/${params.categoryId}/results`),
          // We don't have a direct "get category head" — use the results
          // endpoint which includes phase + revealed_winner_id
          fetch(`/api/awards/categories/${params.categoryId}/results`),
        ]);
        if (cancelled) return;
        const resultsJson: CategoryResults = await resultsRes.json();
        setResults(resultsJson);
        // Derive head from results
        setCategory({
          id: params.categoryId,
          label: "",  // filled below via the dashboard categories list
          phase: resultsJson.phase,
          revealed_winner_id: resultsJson.revealed_winner_id ?? null,
        });
      } catch (err) {
        console.error(err);
      }
    };

    // Also fetch category label once
    const fetchLabel = async () => {
      const res = await fetch(`/api/events/${params.id}/awards/categories`);
      if (!res.ok) return;
      const data = await res.json();
      const c = data.categories?.find(
        (x: { id: string; label: string }) => x.id === params.categoryId,
      );
      if (c && !cancelled) {
        setCategory((prev) =>
          prev ? { ...prev, label: c.label } : { id: params.categoryId, label: c.label, phase: c.phase, revealed_winner_id: c.revealed_winner_id ?? null },
        );
      }
    };
    fetchLabel();

    pull();
    const interval = setInterval(pull, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [params.categoryId, params.id]);

  // When phase transitions INTO 'revealed' for the first time, play stamp.
  // If we open the page already-revealed, skip straight to settled state.
  useEffect(() => {
    if (!results) return;
    const prev = previousPhaseRef.current;
    const cur = results.phase;

    if (cur === "revealed" && !stampPlayed) {
      if (prev === null) {
        // Page loaded already-revealed — show settled state immediately
        setStampPlayed(true);
        setShowName(true);
      } else if (prev !== "revealed") {
        // Phase just flipped during this session — play the animation
        setStampPlayed(true);
        // Trigger name reveal AFTER the stamp impact (~700ms in)
        setTimeout(() => setShowName(true), 700);
      }
    }
    previousPhaseRef.current = cur;
  }, [results, stampPlayed]);

  if (!results || !category) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-stamp-muted-2 text-sm">Loading…</p>
      </div>
    );
  }

  const winner =
    results.phase === "revealed" && results.revealed_winner_id
      ? results.results.find((r) => r.id === results.revealed_winner_id)
      : null;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden flex flex-col">
      <style jsx global>{`
        /* Stamp impact — falls from above, rotates into place, settles
           with a tiny bounce. Single keyframe sequence, no JS animation
           library required. */
        @keyframes stamp-drop {
          0% {
            transform: translateY(-60vh) scale(1.6) rotate(-18deg);
            opacity: 0;
          }
          40% {
            transform: translateY(-10vh) scale(1.3) rotate(-12deg);
            opacity: 0.85;
          }
          /* Impact moment — overshoot then settle */
          70% {
            transform: translateY(0) scale(0.95) rotate(-3deg);
            opacity: 1;
          }
          85% {
            transform: translateY(0) scale(1.05) rotate(-4deg);
          }
          100% {
            transform: translateY(0) scale(1) rotate(-3deg);
            opacity: 1;
          }
        }

        /* Subtle screen shake on impact — sells the weight */
        @keyframes screen-shake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2px, 1px); }
          20% { transform: translate(2px, -1px); }
          30% { transform: translate(-1px, -1px); }
          40% { transform: translate(1px, 1px); }
          50% { transform: translate(0, 0); }
        }

        /* Winner name reveal — letters fade in with subtle upward drift */
        @keyframes name-rise {
          0% {
            opacity: 0;
            transform: translateY(24px);
            filter: blur(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        /* Idle ambient glow on the stamp when settled */
        @keyframes seal-ambient {
          0%, 100% {
            filter: drop-shadow(0 0 24px rgba(255, 92, 26, 0.15));
          }
          50% {
            filter: drop-shadow(0 0 48px rgba(255, 92, 26, 0.35));
          }
        }

        .stamp-anim {
          animation: stamp-drop 900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .stamp-settled {
          transform: rotate(-3deg);
          animation: seal-ambient 4s ease-in-out infinite;
        }
        .impact-shake {
          animation: screen-shake 400ms cubic-bezier(0.4, 0, 0.6, 1);
          animation-delay: 600ms;
        }
        .name-anim {
          animation: name-rise 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header band — category label, kept small so the stage is the center */}
      <header className="p-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-stamp-muted-2">
            STAMP · Award reveal
          </p>
          <h1 className="font-display text-display-md text-stamp-white mt-2 text-balance">
            {category.label}
          </h1>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-stamp-muted-2 tabular-nums">
          {results.phase === "voting_open"
            ? "Voting open"
            : results.phase === "voting_closed"
            ? "Voting closed"
            : results.phase === "revealed"
            ? "Revealed"
            : ""}
        </p>
      </header>

      {/* Center stage — phase-specific content */}
      <div
        className={`flex-1 flex items-center justify-center px-8 ${
          stampPlayed && previousPhaseRef.current !== "revealed"
            ? "impact-shake"
            : ""
        }`}
      >
        {results.phase === "voting_open" && (
          <ProjectorLeaderboard results={results} />
        )}

        {results.phase === "voting_closed" && (
          <div className="text-center space-y-6">
            <div className="flex justify-center text-stamp-muted-2 opacity-40">
              <StampSeal size={200} />
            </div>
            <p className="font-display text-display-md text-stamp-white">
              Counting votes…
            </p>
            <p className="text-stamp-muted-2 text-sm">
              The winner will be revealed shortly.
            </p>
          </div>
        )}

        {results.phase === "revealed" && winner && (
          <div className="text-center max-w-5xl w-full">
            {/* THE stamp */}
            <div
              className={`flex justify-center text-stamp-orange ${
                stampPlayed
                  ? previousPhaseRef.current === "revealed"
                    ? "stamp-settled"  // page-loaded-revealed = no animation
                    : "stamp-anim stamp-settled"
                  : ""
              }`}
              style={{
                animationDelay: stampPlayed && previousPhaseRef.current !== "revealed" ? "0ms" : undefined,
              }}
            >
              <StampSeal size={260} />
            </div>

            {/* Winner name — display-xl with a leading eyebrow */}
            <div className={`mt-12 ${showName ? "name-anim" : "opacity-0"}`}>
              <p className="font-mono text-xs uppercase tracking-[0.5em] text-stamp-gold mb-6">
                Winner
              </p>
              <h2 className="font-display text-display-xl text-stamp-white text-balance leading-[0.95]">
                {winner.display_name}
              </h2>
              {winner.votes_count !== undefined && (
                <p className="font-mono text-sm text-stamp-muted-2 mt-8 tabular-nums tracking-widest">
                  {winner.votes_count.toLocaleString()} VOTES
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer band */}
      <footer className="p-8 flex items-center justify-between text-xs text-stamp-muted-2">
        <p className="font-mono uppercase tracking-[0.3em]">stamptickets.ng</p>
        <p className="font-mono uppercase tracking-[0.3em]">
          Press F11 for fullscreen
        </p>
      </footer>
    </main>
  );
}

/**
 * Projector-sized leaderboard. Top 5 nominees, big readable type, no
 * decorations. Updates every 3 seconds via the polling loop in parent.
 */
function ProjectorLeaderboard({ results }: { results: CategoryResults }) {
  const top = results.results
    .filter((r) => r.votes_count !== undefined)
    .sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0))
    .slice(0, 5);

  if (top.length === 0) {
    return (
      <div className="text-center">
        <p className="font-display text-display-md text-stamp-muted-2">
          Voting open. No votes yet.
        </p>
      </div>
    );
  }

  const leader = top[0]?.votes_count ?? 0;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {top.map((r, idx) => {
        const votes = r.votes_count ?? 0;
        const pct = leader > 0 ? (votes / leader) * 100 : 0;
        const isLeader = idx === 0 && votes > 0;
        return (
          <div key={r.id} className="space-y-2">
            <div className="flex items-baseline justify-between gap-6">
              <div className="flex items-baseline gap-6 min-w-0">
                <span
                  className={`font-mono text-sm tabular-nums shrink-0 ${
                    isLeader ? "text-stamp-orange" : "text-stamp-muted-2"
                  }`}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-display text-display-sm truncate ${
                    isLeader ? "text-stamp-white" : "text-stamp-muted-2"
                  }`}
                >
                  {r.display_name}
                </span>
              </div>
              <span
                className={`font-display text-display-sm tabular-nums shrink-0 ${
                  isLeader ? "text-stamp-orange" : "text-stamp-muted-2"
                }`}
              >
                {votes.toLocaleString()}
              </span>
            </div>
            <div className="h-1 bg-stamp-surface2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isLeader ? "bg-stamp-orange" : "bg-stamp-muted-2"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
