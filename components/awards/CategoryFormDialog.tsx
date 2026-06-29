"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AwardCategory } from "@/types";

interface CategoryFormDialogProps {
  eventId: string;
  existing?: AwardCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create or edit a category. Modal because it's a focused single-purpose
 * task and the dashboard underneath is where the user lives — pulling them
 * to a separate page for two fields would be wasteful.
 *
 * Past draft phase, label and price are read-only (the API enforces this
 * too; we just visualize it). Voters/nominators saw the original numbers.
 */
export function CategoryFormDialog({
  eventId,
  existing,
  onClose,
  onSaved,
}: CategoryFormDialogProps) {
  const [label, setLabel] = useState(existing?.label ?? "");
  const [voteNaira, setVoteNaira] = useState(
    String((existing?.vote_price_kobo ?? 10000) / 100),
  );
  const [resultsPublic, setResultsPublic] = useState(
    existing?.results_public_during_voting ?? false,
  );
  const [maxPerVoter, setMaxPerVoter] = useState(
    existing?.max_votes_per_voter ? String(existing.max_votes_per_voter) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!existing;
  const isLocked = existing?.phase !== undefined && existing.phase !== "draft";

  // Close on Escape — small accessibility detail that matters more than
  // it looks like, since this dialog covers the underlying content fully.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setError(null);
    if (!label.trim()) {
      setError("Category name is required.");
      return;
    }
    const price = parseFloat(voteNaira);
    if (!Number.isFinite(price) || price < 50) {
      setError("Vote price must be at least ₦50.");
      return;
    }
    const maxVotes = maxPerVoter ? parseInt(maxPerVoter, 10) : null;
    if (maxPerVoter && (!Number.isFinite(maxVotes!) || maxVotes! < 1)) {
      setError("Vote cap must be a positive number or left blank.");
      return;
    }

    setSaving(true);
    const payload = {
      label: label.trim(),
      vote_price_naira: price,
      results_public_during_voting: resultsPublic,
      max_votes_per_voter: maxVotes,
    };

    const url = isEdit
      ? `/api/awards/categories/${existing.id}`
      : `/api/events/${eventId}/awards/categories`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't save.");
      setSaving(false);
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg">
        <Card className="space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow>{isEdit ? "Edit category" : "New category"}</Eyebrow>
              <h2 className="font-display text-display-sm text-stamp-white mt-1">
                {isEdit ? existing.label : "What's the award?"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stamp-muted-2 hover:text-stamp-white text-sm"
            >
              Close
            </button>
          </div>

          <Input
            label="Category name"
            placeholder="e.g. Best Dressed Female, MC of the Year"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={isLocked}
            hint={isLocked ? "Locked once nominations open." : undefined}
          />

          <Input
            label="Vote price"
            type="number"
            inputMode="decimal"
            value={voteNaira}
            onChange={(e) => setVoteNaira(e.target.value)}
            prefix="₦"
            disabled={isLocked}
            hint={
              isLocked
                ? "Locked once nominations open."
                : "Per vote. Whales buy in bulk, so this matters less than people expect."
            }
          />

          <Input
            label="Cap votes per phone number (optional)"
            type="number"
            inputMode="numeric"
            placeholder="No limit"
            value={maxPerVoter}
            onChange={(e) => setMaxPerVoter(e.target.value)}
            hint="Leave blank to let voters buy as many as they want. Caps reduce vote revenue."
          />

          <label className="flex items-center gap-3 p-3 rounded-md bg-stamp-surface2 border border-stamp-border cursor-pointer">
            <input
              type="checkbox"
              checked={resultsPublic}
              onChange={(e) => setResultsPublic(e.target.checked)}
              className="accent-stamp-orange"
            />
            <div className="flex-1">
              <p className="text-sm text-stamp-white">
                Show live results during voting
              </p>
              <p className="text-xs text-stamp-muted-2">
                Off keeps everyone guessing until you reveal. Recommended for award nights.
              </p>
            </div>
          </label>

          {error && (
            <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stamp-border">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button glow onClick={handleSave} loading={saving}>
              {isEdit ? "Save" : "Create category"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
