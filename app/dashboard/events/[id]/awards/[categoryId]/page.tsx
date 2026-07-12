"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import { formatNaira } from "@/lib/format";
import { PhaseChip } from "@/components/awards/PhaseChip";
import { NominationsModerationPanel } from "@/components/awards/NominationsModerationPanel";
import { NomineeListEditor } from "@/components/awards/NomineeListEditor";
import { LiveLeaderboard } from "@/components/awards/LiveLeaderboard";
import { RevealDialog } from "@/components/awards/RevealDialog";
import { AddNomineeDialog } from "@/components/awards/AddNomineeDialog";
import type { AwardCategory, AwardNominee } from "@/types";

interface RawGroup {
  name_normalized: string;
  sample_name: string;
  count: number;
  nominator_phones: string[];
  nomination_ids: string[];
}

interface FeedShape {
  category: AwardCategory;
  grouped_pending: RawGroup[];
  nominees: AwardNominee[];
  rejected: Array<{ id: string; nominee_name: string; created_at: string }>;
}

export default function CategoryManagementPage() {
  const params = useParams<{ id: string; categoryId: string }>();
  const [data, setData] = useState<FeedShape | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [addNomineeOpen, setAddNomineeOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const res = await fetch(
      `/api/awards/categories/${params.categoryId}/nominations`,
    );
    if (!res.ok) return;
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    load();
  }, [params.categoryId]);

  const advance = async (targetPhase?: string) => {
    const res = await fetch(
      `/api/awards/categories/${params.categoryId}/advance`,
      {
        method: "POST",
        headers: targetPhase ? { "Content-Type": "application/json" } : {},
        body: targetPhase ? JSON.stringify({ target_phase: targetPhase }) : undefined,
      },
    );
    const json = await res.json();
    if (!res.ok) {
      toast({
        tone: "error",
        title: "Couldn't advance phase",
        body: json.error,
      });
      return;
    }
    load();
  };

  if (!data) {
    return (
      <PageShell>
        <p className="text-stamp-muted-2 text-sm">Loading…</p>
      </PageShell>
    );
  }

  const { category, grouped_pending, nominees } = data;
  const phase = category.phase;
  const eligibleNominees = nominees.filter((n) => !n.is_excluded);
  const totalVotes = eligibleNominees.reduce(
    (s, n) => s + Number(n.votes_count),
    0,
  );
  const totalRevenue = eligibleNominees.reduce(
    (s, n) => s + Number(n.amount_kobo),
    0,
  );
  const slug = new URL("http://placeholder").pathname; // unused, just to keep eslint quiet

  return (
    <PageShell>
      <div className="mb-10">
        <Link
          href={`/dashboard/events/${params.id}/awards`}
          className="inline-flex items-center min-h-[44px] py-2 text-xs text-stamp-muted-2 hover:text-stamp-white"
        >
          ← All categories
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6 mt-3">
          <div className="min-w-0">
            <Eyebrow>Category</Eyebrow>
            <h1 className="font-display text-[2rem] xs:text-display-md sm:text-display-lg text-stamp-white mt-2 text-balance">
              {category.label}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-xs text-stamp-muted-2 flex-wrap">
              <PhaseChip phase={phase} />
              <span>
                {category.vote_price_kobo === 0
                  ? "Free poll"
                  : `${formatNaira(category.vote_price_kobo)}/vote`}
              </span>
              {category.max_votes_per_voter && (
                <span>Cap: {category.max_votes_per_voter}/voter</span>
              )}
            </div>
          </div>

          {/* Phase advance action — the one big move the organizer's here for.
              Mobile: buttons stack full-width in reading order (add first,
              skip second, primary third) so no wrapping. Desktop: inline
              row, secondary actions to the left of the glow CTA. */}
          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:justify-end lg:justify-end">
            {["draft", "nominations_open", "moderation"].includes(phase) && (
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => setAddNomineeOpen(true)}
                className="sm:w-auto"
              >
                + Add nominee
              </Button>
            )}
            <PhaseAdvanceCTA
              phase={phase}
              onAdvance={advance}
              onReveal={() => setRevealOpen(true)}
              canAdvance={
                (phase === "moderation" ||
                  (phase === "draft" && eligibleNominees.length >= 2) ||
                  (phase === "nominations_open" && eligibleNominees.length >= 2))
                  ? eligibleNominees.length >= 2
                  : true
              }
              canSkipToVoting={
                (phase === "draft" || phase === "nominations_open") &&
                eligibleNominees.length >= 2
              }
            />
          </div>
        </div>
      </div>

      {/* Phase-specific body */}
      <PhaseBody
        phase={phase}
        groupedPending={grouped_pending}
        nominees={nominees}
        totalVotes={totalVotes}
        totalRevenue={totalRevenue}
        eventId={params.id}
        categoryId={params.categoryId}
        onAddNominee={() => setAddNomineeOpen(true)}
        onChange={load}
      />

      {addNomineeOpen && (
        <AddNomineeDialog
          categoryId={params.categoryId}
          categoryLabel={category.label}
          onClose={() => setAddNomineeOpen(false)}
          onAdded={() => {
            setAddNomineeOpen(false);
            load();
            toast({ tone: "success", title: "Nominee added to ballot" });
          }}
        />
      )}

      {revealOpen && (
        <RevealDialog
          category={category}
          nominees={eligibleNominees}
          onClose={() => setRevealOpen(false)}
          onRevealed={() => {
            setRevealOpen(false);
            load();
          }}
        />
      )}
    </PageShell>
  );
}

function PhaseAdvanceCTA({
  phase,
  onAdvance,
  onReveal,
  canAdvance,
  canSkipToVoting,
}: {
  phase: AwardCategory["phase"];
  /** Bare call = advance one step. Pass a target phase to jump further. */
  onAdvance: (targetPhase?: string) => void;
  onReveal: () => void;
  canAdvance: boolean;
  /** When true, we surface a secondary "Skip to voting" affordance —
   *  organizer has already added ≥2 nominees directly and doesn't want
   *  to bother with public nominations / moderation. */
  canSkipToVoting: boolean;
}) {
  if (phase === "revealed") {
    return (
      <Badge tone="success" dot>
        Revealed
      </Badge>
    );
  }

  const cta: { label: string; action: () => void } | null = (() => {
    switch (phase) {
      case "draft":
        return { label: "Open nominations →", action: () => onAdvance() };
      case "nominations_open":
        return { label: "Close nominations →", action: () => onAdvance() };
      case "moderation":
        return { label: "Open voting →", action: () => onAdvance() };
      case "voting_open":
        return { label: "Close voting →", action: () => onAdvance() };
      case "voting_closed":
        return { label: "Reveal winner →", action: onReveal };
      default:
        return null;
    }
  })();
  if (!cta) return null;

  return (
    <>
      {canSkipToVoting && (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => onAdvance("voting_open")}
          className="sm:w-auto"
        >
          Skip to voting →
        </Button>
      )}
      <Button
        glow
        size="lg"
        fullWidth
        onClick={cta.action}
        disabled={!canAdvance}
        className="sm:w-auto"
      >
        {cta.label}
      </Button>
    </>
  );
}

function PhaseBody({
  phase,
  groupedPending,
  nominees,
  totalVotes,
  totalRevenue,
  eventId,
  categoryId,
  onChange,
}: {
  phase: AwardCategory["phase"];
  groupedPending: RawGroup[];
  nominees: AwardNominee[];
  totalVotes: number;
  totalRevenue: number;
  eventId: string;
  categoryId: string;
  onAddNominee: () => void;
  onChange: () => void;
}) {
  // What's the most useful thing for the organizer to see RIGHT NOW given
  // the current phase? Each phase has a different body composition.

  const eligibleNominees = nominees.filter((n) => !n.is_excluded);

  if (phase === "draft") {
    return (
      <div className="space-y-6">
        {eligibleNominees.length > 0 ? (
          // Organizer has added nominees directly. Show them the ballot
          // preview + inline nominee editor so they can iterate before
          // opening voting.
          <>
            <Card accent>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <Eyebrow tone="success">Ballot forming</Eyebrow>
                  <h3 className="font-display text-display-xs text-stamp-white mt-2">
                    {eligibleNominees.length} nominee
                    {eligibleNominees.length === 1 ? "" : "s"} added.
                  </h3>
                  <p className="text-sm text-stamp-muted-2 mt-2">
                    {eligibleNominees.length >= 2
                      ? "You can skip nominations and go straight to voting from the button above."
                      : "Add one more to be able to open voting."}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <Eyebrow>On ballot</Eyebrow>
              <NomineeListEditor
                nominees={nominees}
                onChange={onChange}
                phase={phase}
              />
            </Card>
          </>
        ) : (
          <Card accent>
            <Eyebrow>Two ways to fill the ballot</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-2">
              Open public nominations, or add nominees yourself.
            </h3>
            <p className="text-sm text-stamp-muted-2 mt-2">
              Public nominations let anyone with the link nominate — you moderate the list afterward. Or add nominees directly from the "+ Add nominee" button above and skip straight to voting.
            </p>
          </Card>
        )}
      </div>
    );
  }

  if (phase === "nominations_open") {
    return (
      <div className="space-y-6">
        <NominationLink eventId={eventId} />
        <Card>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <Eyebrow>Nominations rolling in</Eyebrow>
              <p className="font-display text-display-md text-stamp-white mt-2 tabular-nums">
                {groupedPending.reduce((s, g) => s + g.count, 0)}
              </p>
              <p className="text-xs text-stamp-muted-2 mt-1">
                {groupedPending.length} unique name{groupedPending.length === 1 ? "" : "s"}
              </p>
            </div>
            {eligibleNominees.length > 0 && (
              <div className="text-right">
                <Eyebrow>You've added</Eyebrow>
                <p className="font-display text-display-md text-stamp-orange mt-2 tabular-nums">
                  {eligibleNominees.length}
                </p>
              </div>
            )}
          </div>
          {groupedPending.length > 0 && (
            <div className="mt-6 pt-6 border-t border-stamp-border space-y-2">
              <Eyebrow>Top so far</Eyebrow>
              <ul className="space-y-1.5">
                {groupedPending.slice(0, 5).map((g) => (
                  <li
                    key={g.name_normalized}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-stamp-white">{g.sample_name}</span>
                    <span className="text-xs text-stamp-muted-2 tabular-nums">
                      {g.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        {eligibleNominees.length > 0 && (
          <Card>
            <Eyebrow>Your ballot (added directly)</Eyebrow>
            <NomineeListEditor
              nominees={nominees}
              onChange={onChange}
              phase={phase}
            />
          </Card>
        )}
        <p className="text-xs text-stamp-muted-2 text-center">
          You'll moderate the public list after closing nominations. Or skip straight to voting if your ballot is ready.
        </p>
      </div>
    );
  }

  if (phase === "moderation") {
    return (
      <NominationsModerationPanel
        groupedPending={groupedPending}
        nominees={nominees}
        onChange={onChange}
      />
    );
  }

  if (phase === "voting_open") {
    return (
      <div className="space-y-6">
        <VotingLink eventId={eventId} />
        <LiveLeaderboard
          nominees={nominees.filter((n) => !n.is_excluded)}
          totalVotes={totalVotes}
          totalRevenue={totalRevenue}
        />
        <Card>
          <Eyebrow>Nominees on ballot</Eyebrow>
          <NomineeListEditor
            nominees={nominees}
            onChange={onChange}
            phase={phase}
          />
        </Card>
      </div>
    );
  }

  if (phase === "voting_closed") {
    return (
      <div className="space-y-6">
        <LiveLeaderboard
          nominees={nominees.filter((n) => !n.is_excluded)}
          totalVotes={totalVotes}
          totalRevenue={totalRevenue}
        />
        <Card accent elevated>
          <Eyebrow>Ready to reveal</Eyebrow>
          <h3 className="font-display text-display-xs text-stamp-white mt-2">
            Click "Reveal winner" above to lock results.
          </h3>
          <p className="text-sm text-stamp-muted-2 mt-2">
            We'll auto-pick the leader unless you choose a different winner manually. You can also send the winner a WhatsApp notification at the same time.
          </p>
          <div className="mt-4">
            <Link
              href={`/dashboard/events/${eventId}/awards/${categoryId}/screen`}
              target="_blank"
              className="text-xs text-stamp-orange hover:underline"
            >
              Open projector screen → (opens in new tab)
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // revealed
  const winner = nominees.find(
    (n) => n.id === (nominees[0]?.category_id ? undefined : undefined),
  );
  return (
    <div className="space-y-6">
      <LiveLeaderboard
        nominees={nominees.filter((n) => !n.is_excluded)}
        totalVotes={totalVotes}
        totalRevenue={totalRevenue}
        revealed
      />
      <Card accent elevated tone="default" className="text-center py-10">
        <Eyebrow align="center">Winner revealed</Eyebrow>
        <Link
          href={`/dashboard/events/${eventId}/awards/${categoryId}/screen`}
          target="_blank"
          className="inline-block mt-4 text-sm text-stamp-orange hover:underline"
        >
          Open projector screen →
        </Link>
      </Card>
    </div>
  );
}

function NominationLink({ eventId }: { eventId: string }) {
  // We need the event slug. We don't have it client-side here easily,
  // so let the parent inject; for now derive from a known endpoint.
  // For V1 we just show /[slug]/nominate as a placeholder, since the
  // organizer can construct it from the event link they already use.
  return (
    <Card>
      <Eyebrow>Share the nomination link</Eyebrow>
      <p className="text-xs text-stamp-muted-2 mt-1">
        Send to anyone you want to nominate. Same page lets them nominate for any open category in this event.
      </p>
      <NominationLinkLoader eventId={eventId} suffix="nominate" />
    </Card>
  );
}

function VotingLink({ eventId }: { eventId: string }) {
  return (
    <Card>
      <Eyebrow>Share the voting link</Eyebrow>
      <p className="text-xs text-stamp-muted-2 mt-1">
        Voters pick a nominee, choose vote quantity, pay via card or transfer. Money flows straight to your bank.
      </p>
      <NominationLinkLoader eventId={eventId} suffix="awards" />
    </Card>
  );
}

function NominationLinkLoader({
  eventId,
  suffix,
}: {
  eventId: string;
  suffix: "nominate" | "awards";
}) {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/events/${eventId}/dashboard`)
      .then((r) => r.json())
      .then((d) => setSlug(d.event?.slug))
      .catch(() => {});
  }, [eventId]);
  if (!slug) return null;
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/${slug}/${suffix}`;
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="flex-1 text-sm text-stamp-orange truncate p-3 bg-stamp-surface2 rounded-md border border-stamp-border">
        {url}
      </code>
      <CopyButton text={url} />
    </div>
  );
}