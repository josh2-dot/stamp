"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { AwardNominee } from "@/types";

interface RawGroup {
  name_normalized: string;
  sample_name: string;
  count: number;
  nominator_phones: string[];
  nomination_ids: string[];
}

interface NominationsModerationPanelProps {
  groupedPending: RawGroup[];
  nominees: AwardNominee[];
  onChange: () => void;
}

/**
 * Manual moderation UI. The organizer sees raw nominations grouped by
 * normalized name (lowercase + trimmed). For each group:
 *
 *   - Promote → creates a new ballot entry OR merges into an existing one
 *   - Reject → marks as rejected, won't reappear
 *
 * The "merge into existing" path is the manual dedupe — the organizer
 * sees a typo group like "Joshua Theophillus" (1 nom), recognizes it as
 * the same person as "Joshua Theophilus" (12 noms), and merges. No fuzzy
 * matching algorithm; the organizer is the algorithm.
 *
 * Once the ballot has 2+ promoted nominees, the parent unlocks the
 * "Open voting →" button.
 */
export function NominationsModerationPanel({
  groupedPending,
  nominees,
  onChange,
}: NominationsModerationPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{
    group: RawGroup;
  } | null>(null);
  const { toast } = useToast();

  const activeNominees = nominees.filter((n) => !n.is_excluded);

  const handlePromote = async (group: RawGroup, intoNomineeId?: string) => {
    setBusy(group.name_normalized);
    const res = await fetch("/api/awards/nominations/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomination_ids: group.nomination_ids,
        into_nominee_id: intoNomineeId,
      }),
    });
    const data = await res.json();
    setBusy(null);
    setMergeTarget(null);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "Couldn't promote nomination",
        body: data.error,
      });
      return;
    }
    toast({
      tone: "success",
      title: intoNomineeId
        ? `Merged into ${activeNominees.find((n) => n.id === intoNomineeId)?.display_name ?? "ballot"}`
        : `Promoted "${group.sample_name}" to ballot`,
    });
    onChange();
  };

  const handleReject = async (group: RawGroup) => {
    // confirm() is the one native dialog kept for V1 — it's a destructive
    // confirmation, not an error display. A dedicated <ConfirmDialog> would
    // be the natural follow-up, but the alert()s were the more visible regression.
    if (!confirm(`Reject all ${group.count} nominations for "${group.sample_name}"?`)) return;
    setBusy(group.name_normalized);
    const res = await fetch("/api/awards/nominations/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomination_ids: group.nomination_ids }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      toast({
        tone: "error",
        title: "Couldn't reject nominations",
        body: data.error,
      });
      return;
    }
    toast({
      tone: "info",
      title: `Rejected "${group.sample_name}"`,
    });
    onChange();
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <Eyebrow>Moderation</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-2">
              {groupedPending.length} name{groupedPending.length === 1 ? "" : "s"} to review
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-stamp-muted-2">On ballot</p>
            <p className="font-display text-display-sm text-stamp-orange tabular-nums">
              {activeNominees.length}
            </p>
          </div>
        </div>
        <p className="text-xs text-stamp-muted-2 mt-3">
          Sorted by nomination count. Promote each name to the ballot, or merge variants of the same person into one entry.
        </p>
      </Card>

      {groupedPending.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-stamp-muted-2 text-sm">
            All nominations have been moderated.
          </p>
          {activeNominees.length >= 2 ? (
            <p className="text-stamp-green text-xs mt-2">
              ✓ Ballot is ready. Open voting from the top of the page.
            </p>
          ) : (
            <p className="text-stamp-gold text-xs mt-2">
              Need at least 2 promoted nominees before voting can open.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {groupedPending.map((group) => (
            <Card key={group.name_normalized} className="!p-0">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stamp-white truncate">
                      {group.sample_name}
                    </p>
                    <Badge tone="default">{group.count} nomination{group.count === 1 ? "" : "s"}</Badge>
                  </div>
                  <p className="text-xs text-stamp-muted-2 mt-1 truncate">
                    From {[...new Set(group.nominator_phones)].length} unique nominator
                    {[...new Set(group.nominator_phones)].length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeNominees.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMergeTarget({ group })}
                      disabled={busy !== null}
                    >
                      Merge…
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReject(group)}
                    disabled={busy !== null}
                    className="text-stamp-red hover:bg-stamp-red/10"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    glow
                    onClick={() => handlePromote(group)}
                    loading={busy === group.name_normalized}
                  >
                    Promote
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* On-ballot nominees, with inline edit/exclude affordances */}
      {activeNominees.length > 0 && (
        <Card>
          <Eyebrow>On ballot</Eyebrow>
          <ul className="mt-3 space-y-1.5">
            {activeNominees.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-md hover:bg-stamp-surface2"
              >
                <span className="text-stamp-white truncate">{n.display_name}</span>
                <Badge tone="success" dot>
                  Promoted
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Merge picker dialog */}
      {mergeTarget && (
        <MergePicker
          group={mergeTarget.group}
          nominees={activeNominees}
          onCancel={() => setMergeTarget(null)}
          onMerge={(nomineeId) => handlePromote(mergeTarget.group, nomineeId)}
        />
      )}
    </div>
  );
}

function MergePicker({
  group,
  nominees,
  onCancel,
  onMerge,
}: {
  group: RawGroup;
  nominees: AwardNominee[];
  onCancel: () => void;
  onMerge: (nomineeId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = nominees.filter((n) =>
    n.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md">
        <Card className="space-y-4">
          <div>
            <Eyebrow>Merge into existing</Eyebrow>
            <h3 className="font-display text-display-xs text-stamp-white mt-2">
              "{group.sample_name}" ({group.count} nomination{group.count === 1 ? "" : "s"})
            </h3>
            <p className="text-xs text-stamp-muted-2 mt-2">
              Pick the ballot entry this name should fold into.
            </p>
          </div>

          <input
            type="text"
            placeholder="Filter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-md bg-stamp-surface2 border border-stamp-border text-sm text-stamp-white placeholder:text-stamp-muted-2 focus:outline-none focus:border-stamp-orange"
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-stamp-muted-2 text-center py-4">
                No matches.
              </p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onMerge(n.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-stamp-white hover:bg-stamp-orange/15 hover:text-stamp-orange transition-colors"
                >
                  {n.display_name}
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-stamp-border">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
