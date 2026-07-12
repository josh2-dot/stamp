"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { StampSeal } from "@/components/ui/StampSeal";
import { formatNaira } from "@/lib/format";
import { VoteFlow } from "@/components/awards/VoteFlow";
import type { AwardPhase } from "@/types";

interface PublicNominee {
  id: string;
  display_name: string;
  description: string | null;
  photo_url: string | null;
  sort_order: number;
}

interface PublicCategory {
  id: string;
  label: string;
  phase: AwardPhase;
  vote_price_kobo: number;
  voting_close_at: string | null;
  results_public_during_voting: boolean;
  revealed_winner_id: string | null;
  max_votes_per_voter: number | null;
}

interface FeedShape {
  event: {
    id: string;
    slug: string;
    title: string;
    venue: string;
    event_date: string;
    awards_enabled: boolean;
  };
  categories: PublicCategory[];
  nominees_by_category: Record<string, PublicNominee[]>;
}

export default function AwardsPage() {
  return (
    <Suspense fallback={null}>
      <AwardsInner />
    </Suspense>
  );
}

function AwardsInner() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const voteRef = search.get("vote_ref");
  const [data, setData] = useState<FeedShape | null>(null);
  const [activeVote, setActiveVote] = useState<{
    category: PublicCategory;
    nominee: PublicNominee;
  } | null>(null);

  const load = () => {
    fetch(`/api/awards/event/${params.slug}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  };

  useEffect(load, [params.slug]);

  if (!data) {
    return (
      <PageShell>
        <p className="text-stamp-muted-2 text-sm">Loading…</p>
      </PageShell>
    );
  }

  if (!data.event.awards_enabled || data.categories.length === 0) {
    return (
      <PageShell maxWidth="md">
        <Card className="text-center py-12">
          <Eyebrow align="center">Awards</Eyebrow>
          <h1 className="font-display text-display-md text-stamp-white mt-3">
            No awards yet.
          </h1>
          <p className="text-stamp-muted-2 text-sm mt-3">
            This event doesn't have any award categories.
          </p>
          
            <a href={`/${params.slug}`}
            className="inline-block mt-6 text-sm text-stamp-orange hover:underline"
          >
            View event →
          </a>
        </Card>
      </PageShell>
    );
  }

  // Only categories where there's something for the public to do:
  // voting_open, voting_closed, or revealed
  const liveCategories = data.categories.filter((c) =>
    ["voting_open", "voting_closed", "revealed"].includes(c.phase),
  );

  return (
    <PageShell>
      {/* Vote-just-completed banner — appears after Paystack callback */}
      {voteRef && (
        <Card accent elevated className="mb-8 text-center py-6">
          <div className="flex justify-center text-stamp-green mb-3">
            <StampSeal size={64} />
          </div>
          <p className="text-stamp-white">
            Your vote is in.{" "}
            <span className="text-stamp-muted-2">
              Powered by STAMP. Money flows straight to the organizer.
            </span>
          </p>
        </Card>
      )}

      <div className="mb-10">
        <Eyebrow>Awards</Eyebrow>
        <h1 className="font-display text-display-lg text-stamp-white mt-2 text-balance">
          {data.event.title}
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3 max-w-xl">
          Vote for who you think deserves it. Each vote is paid — buy as many as you want for your nominee.
        </p>
      </div>

      <div className="space-y-12">
        {liveCategories.map((c) => (
          <CategorySection
            key={c.id}
            category={c}
            nominees={data.nominees_by_category[c.id] ?? []}
            onVote={(nominee) => setActiveVote({ category: c, nominee })}
          />
        ))}
      </div>

      {activeVote && (
        <VoteFlow
          category={activeVote.category}
          nominee={activeVote.nominee}
          eventSlug={params.slug}
          onClose={() => setActiveVote(null)}
        />
      )}
    </PageShell>
  );
}

function CategorySection({
  category,
  nominees,
  onVote,
}: {
  category: PublicCategory;
  nominees: PublicNominee[];
  onVote: (n: PublicNominee) => void;
}) {
  const [results, setResults] = useState<{
    hidden: boolean;
    total_votes?: number;
    results: Array<{
      id: string;
      display_name: string;
      photo_url: string | null;
      votes_count?: number;
      percent: number;
      is_winner: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    // Only fetch results for voting_open + revealed phases; voting_closed
    // hides counts from the public.
    if (category.phase === "voting_open" || category.phase === "revealed") {
      fetch(`/api/awards/categories/${category.id}/results`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }
  }, [category.id, category.phase]);

  const isVoting = category.phase === "voting_open";
  const isRevealed = category.phase === "revealed";

  const sortedNominees = [...nominees].sort((a, b) => {
    // Sort by vote count if available; else by sort_order
    if (results && !results.hidden) {
      const aRes = results.results.find((r) => r.id === a.id);
      const bRes = results.results.find((r) => r.id === b.id);
      if (aRes && bRes) {
        return (bRes.votes_count ?? bRes.percent) - (aRes.votes_count ?? aRes.percent);
      }
    }
    return a.sort_order - b.sort_order;
  });

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <Eyebrow>{category.phase === "voting_open" ? "Voting open" : category.phase === "revealed" ? "Winner" : "Voting closed"}</Eyebrow>
          <h2 className="font-display text-[1.75rem] xs:text-display-md text-stamp-white mt-2 text-balance">
            {category.label}
          </h2>
        </div>
        {isVoting && (
          <div className="text-right shrink-0">
            {category.vote_price_kobo === 0 ? (
              <>
                <p className="text-xs text-stamp-muted-2">Voting is</p>
                <p className="font-display text-display-xs text-stamp-orange">
                  Free
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-stamp-muted-2">Per vote</p>
                <p className="font-display text-display-xs text-stamp-orange">
                  {formatNaira(category.vote_price_kobo)}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedNominees.map((n) => {
          const res = results?.results.find((r) => r.id === n.id);
          const isWinner = res?.is_winner;
          return (
            <NomineeCard
              key={n.id}
              nominee={n}
              percent={results && !results.hidden ? res?.percent : undefined}
              votes={results && !results.hidden ? res?.votes_count : undefined}
              isWinner={!!isWinner}
              showVoteButton={isVoting}
              onVote={() => onVote(n)}
            />
          );
        })}
      </div>

      {category.phase === "voting_closed" && (
        <p className="text-xs text-stamp-muted-2 text-center mt-6">
          Voting closed. Winner reveal coming up.
        </p>
      )}
    </section>
  );
}

function NomineeCard({
  nominee,
  percent,
  votes,
  isWinner,
  showVoteButton,
  onVote,
}: {
  nominee: PublicNominee;
  percent?: number;
  votes?: number;
  isWinner: boolean;
  showVoteButton: boolean;
  onVote: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg border overflow-hidden transition-all ${
        isWinner
          ? "border-stamp-gold bg-stamp-gold/5 shadow-[0_0_0_1px_rgba(220,170,40,0.3),0_8px_24px_-8px_rgba(220,170,40,0.4)]"
          : "border-stamp-border bg-stamp-surface"
      }`}
    >
      {/* Photo area — falls back to initials when no photo.
          Mobile: shallow 3:2 aspect so the card doesn't dominate a
          single-scroll view. Desktop: back to aspect-square where the
          3-column grid needs the taller shape to keep the row rhythm. */}
      <div className="aspect-[3/2] sm:aspect-square bg-stamp-surface2 relative">
        {nominee.photo_url ? (
          <img
            src={nominee.photo_url}
            alt={nominee.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[3.5rem] sm:text-display-xl text-stamp-muted-2 opacity-30">
              {nominee.display_name
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
        )}

        {isWinner && (
          <div className="absolute top-3 right-3">
            <Badge tone="warning" dot>
              Winner
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3
            className={`font-display text-display-xs ${
              isWinner ? "text-stamp-gold" : "text-stamp-white"
            } truncate`}
          >
            {nominee.display_name}
          </h3>
          {nominee.description && (
            <p className="text-xs text-stamp-muted-2 mt-1 truncate">
              {nominee.description}
            </p>
          )}
        </div>

        {percent !== undefined && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-stamp-muted-2 tabular-nums">{percent}%</span>
              {votes !== undefined && (
                <span className="text-stamp-muted-2 tabular-nums">
                  {votes.toLocaleString()} vote{votes === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="h-0.5 bg-stamp-surface2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isWinner ? "bg-stamp-gold" : "bg-stamp-orange"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {showVoteButton && (
          <Button glow size="md" fullWidth onClick={onVote}>
            Vote →
          </Button>
        )}
      </div>
    </div>
  );
}