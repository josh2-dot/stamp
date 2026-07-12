"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatNaira } from "@/lib/format";
import { PhaseChip } from "@/components/awards/PhaseChip";
import { CategoryFormDialog } from "@/components/awards/CategoryFormDialog";
import type { AwardCategory } from "@/types";

interface CategoryWithStats extends AwardCategory {
  nominations_count: number;
  nominees_count: number;
  vote_revenue_kobo: number;
}

export default function AwardsOverviewPage() {
  const params = useParams<{ id: string }>();
  const [categories, setCategories] = useState<CategoryWithStats[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryWithStats | null>(null);

  const load = async () => {
    const res = await fetch(`/api/events/${params.id}/awards/categories`);
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.categories);
  };

  useEffect(() => {
    load();
  }, [params.id]);

  if (categories === null) {
    return (
      <PageShell>
        <p className="text-stamp-muted-2 text-sm">Loading…</p>
      </PageShell>
    );
  }

  const empty = categories.length === 0;
  const totalRevenue = categories.reduce((s, c) => s + c.vote_revenue_kobo, 0);
  const totalNominations = categories.reduce(
    (s, c) => s + c.nominations_count,
    0,
  );

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
        <div className="min-w-0">
          <Link
            href={`/dashboard/events/${params.id}`}
            className="inline-flex items-center min-h-[44px] py-2 text-xs text-stamp-muted-2 hover:text-stamp-white"
          >
            ← Event dashboard
          </Link>
          <Eyebrow className="mt-2">Awards</Eyebrow>
          <h1 className="font-display text-[2rem] xs:text-display-md sm:text-display-lg text-stamp-white mt-2 text-balance leading-[0.95]">
            {empty ? "Set up an award show." : "Run your award show."}
          </h1>
          <p className="text-stamp-muted-2 text-sm mt-3 max-w-xl text-pretty">
            {empty
              ? "Create categories, take public nominations, run voting, reveal winners. STAMP charges a flat fee per event — only when votes come in."
              : "Each category runs its own lifecycle. Nominations → moderation → voting → reveal."}
          </p>
        </div>
        {!empty && (
          <Button
            glow
            size="lg"
            fullWidth
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="sm:w-auto sm:size-md"
          >
            + New category
          </Button>
        )}
      </div>

      {empty ? (
        // Empty state — a real onboarding moment, not just a sad blank page.
        // The 3-step explanation removes the "what is this?" mental tax
        // before they click anything.
        <Card accent elevated className="text-center py-12 space-y-6">
          <Eyebrow align="center">Three phases, four clicks each</Eyebrow>
          <h2 className="font-display text-display-sm text-stamp-white max-w-md mx-auto">
            Open nominations, then voting, then reveal — for as many categories as you want.
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left mt-8">
            {[
              {
                step: "01",
                title: "Categories",
                body: "Add award categories (e.g. \"Best Dressed\", \"MC of the Year\"). Set the price per vote.",
              },
              {
                step: "02",
                title: "Nominations",
                body: "Open public nominations — anyone with the link can nominate. Moderate the list and lock the ballot.",
              },
              {
                step: "03",
                title: "Voting & reveal",
                body: "Voters pay per vote, money flows 100% to you. Reveal on the night with the projector screen.",
              },
            ].map((s) => (
              <div key={s.step} className="space-y-2">
                <p className="font-mono text-xs text-stamp-orange">{s.step}</p>
                <h3 className="font-display text-display-xs text-stamp-white">
                  {s.title}
                </h3>
                <p className="text-xs text-stamp-muted-2 leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-6">
            <Button glow size="lg" onClick={() => { setEditing(null); setShowForm(true); }}>
              + Create your first category
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary stats — kept light, the real action is below.
              Mobile: revenue on its own row so the naira number never
              wraps against the two count cards on 375px. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card>
              <Eyebrow>Categories</Eyebrow>
              <p className="font-display text-display-xs sm:text-display-sm text-stamp-white mt-2 tabular-nums">
                {categories.length}
              </p>
            </Card>
            <Card>
              <Eyebrow>Nominations</Eyebrow>
              <p className="font-display text-display-xs sm:text-display-sm text-stamp-white mt-2 tabular-nums">
                {totalNominations.toLocaleString()}
              </p>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <Eyebrow>Vote revenue</Eyebrow>
              <p className="font-display text-display-xs sm:text-display-sm text-stamp-orange mt-2 tabular-nums">
                {formatNaira(totalRevenue)}
              </p>
            </Card>
          </div>

          <div className="space-y-3">
            {categories.map((c) => (
              <CategoryRow
                key={c.id}
                eventId={params.id}
                category={c}
                onEdit={() => { setEditing(c); setShowForm(true); }}
                onChange={load}
              />
            ))}
          </div>
        </>
      )}

      {showForm && (
        <CategoryFormDialog
          eventId={params.id}
          existing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            load();
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </PageShell>
  );
}

interface CategoryRowProps {
  eventId: string;
  category: CategoryWithStats;
  onEdit: () => void;
  onChange: () => void;
}

function CategoryRow({ eventId, category, onEdit, onChange }: CategoryRowProps) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const phase = category.phase;

  // Each phase has its own primary affordance — the "what would I do next?"
  // button. Color of the button matches PhaseChip semantics.
  const nextAction = (() => {
    switch (phase) {
      case "draft":
        return { label: "Open nominations →", tone: "primary" as const };
      case "nominations_open":
        return { label: "Close nominations →", tone: "neutral" as const };
      case "moderation":
        return { label: "Open voting →", tone: "primary" as const };
      case "voting_open":
        return { label: "Close voting →", tone: "neutral" as const };
      case "voting_closed":
        return { label: "Reveal winner →", tone: "primary" as const };
      case "revealed":
        return null;
    }
  })();

  const handleAdvance = async () => {
    setBusy(true);
    const res = await fetch(`/api/awards/categories/${category.id}/advance`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        tone: "error",
        title: "Couldn't advance phase",
        body: data.error,
      });
      setBusy(false);
      return;
    }
    onChange();
    setBusy(false);
  };

  // Quick stats per phase
  const stat = (() => {
    switch (phase) {
      case "draft":
        return `${formatNaira(category.vote_price_kobo)}/vote`;
      case "nominations_open":
        return `${category.nominations_count} nomination${category.nominations_count === 1 ? "" : "s"}`;
      case "moderation":
        return `${category.nominations_count} to review · ${category.nominees_count} on ballot`;
      case "voting_open":
      case "voting_closed":
      case "revealed":
        return `${category.nominees_count} nominees · ${formatNaira(category.vote_revenue_kobo)}`;
    }
  })();

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-0">
        <Link
          href={`/dashboard/events/${eventId}/awards/${category.id}`}
          className="group p-5 hover:bg-stamp-surface2/40 transition-colors"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display text-display-xs text-stamp-white group-hover:text-stamp-orange transition-colors">
              {category.label}
            </h3>
            <PhaseChip phase={phase} />
          </div>
          <p className="text-stamp-muted-2 text-xs mt-2">{stat}</p>
        </Link>

        <div className="flex items-center gap-2 p-4 sm:pr-5 border-t sm:border-t-0 sm:border-l border-stamp-border">
          {phase === "draft" && (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Edit
            </Button>
          )}
          {nextAction ? (
            phase === "voting_closed" ? (
              <Link href={`/dashboard/events/${eventId}/awards/${category.id}`}>
                <Button size="sm" glow>
                  {nextAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                glow={nextAction.tone === "primary"}
                onClick={handleAdvance}
                loading={busy}
              >
                {nextAction.label}
              </Button>
            )
          ) : (
            <Badge tone="success" dot>
              Winner revealed
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
