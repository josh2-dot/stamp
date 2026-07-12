"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import type { AwardCategory, AwardNominee } from "@/types";

interface RevealDialogProps {
  category: AwardCategory;
  nominees: AwardNominee[];
  onClose: () => void;
  onRevealed: () => void;
}

/**
 * The final-step interface. Two decisions stack here:
 *
 *  1. Who's the winner? The leader is pre-selected (the common case), but
 *     the organizer can override — useful for tied votes, late-stage
 *     fraud discoveries, or honorary picks.
 *
 *  2. Should we notify the winner? If yes, they enter the winner's
 *     WhatsApp number. We fire a message before flipping phase to
 *     'revealed'. Optional — many organizers prefer to call the winner
 *     in person at the ceremony.
 *
 * The "Reveal" button is the only glow CTA in the dialog — it should feel
 * weighty. Once clicked, phase advances to 'revealed' and the projector
 * screen will show the winner with the signature stamp animation.
 */
export function RevealDialog({
  category,
  nominees,
  onClose,
  onRevealed,
}: RevealDialogProps) {
  const sorted = [...nominees].sort(
    (a, b) => Number(b.votes_count) - Number(a.votes_count),
  );
  const leader = sorted[0];

  const [winnerId, setWinnerId] = useState<string>(leader?.id ?? "");
  const [notify, setNotify] = useState(true);
  const [winnerPhone, setWinnerPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape + backdrop dismiss handled by Sheet.

  const winner = nominees.find((n) => n.id === winnerId);

  const handleReveal = async () => {
    setError(null);
    if (!winnerId) {
      setError("Pick a winner first.");
      return;
    }
    if (notify && !winnerPhone.trim()) {
      setError("Add the winner's phone or turn off notification.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/awards/categories/${category.id}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner_nominee_id: winnerId,
        winner_phone: notify ? winnerPhone.trim() : undefined,
        custom_message: customMessage.trim() || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Couldn't reveal");
      return;
    }
    onRevealed();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      maxWidth="lg"
      dismissible={!busy}
      ariaLabel={`Reveal ${category.label} winner`}
    >
      <div className="sticky top-0 bg-stamp-surface z-10 px-5 sm:px-6 pt-4 pb-3 border-b border-stamp-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>Reveal winner</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-1.5 text-balance">
              {category.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
            className="shrink-0 -mr-2 -mt-1 w-10 h-10 rounded-md flex items-center justify-center text-stamp-muted-2 hover:text-stamp-white hover:bg-stamp-surface2 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-stamp-muted-2 mt-2 text-pretty">
          Locks the result, sends the optional winner notification, and switches the projector screen to the reveal animation.
        </p>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
          <div>
            <Eyebrow>Winner</Eyebrow>
            <div className="mt-2 space-y-1.5">
              {sorted.map((n, idx) => {
                const votes = Number(n.votes_count);
                const isSelected = winnerId === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setWinnerId(n.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors min-h-[56px] ${
                      isSelected
                        ? "bg-stamp-gold/10 border-stamp-gold/40"
                        : "bg-stamp-surface2 border-stamp-border hover:border-stamp-muted-2"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            isSelected ? "text-stamp-gold" : "text-stamp-muted-2"
                          }`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`truncate ${
                            isSelected
                              ? "text-stamp-gold font-medium"
                              : "text-stamp-white"
                          }`}
                        >
                          {n.display_name}
                        </span>
                        {idx === 0 && (
                          <Badge tone="default">Leader</Badge>
                        )}
                      </div>
                      <span className="text-xs text-stamp-muted-2 tabular-nums shrink-0">
                        {votes.toLocaleString()} votes
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-md bg-stamp-surface2 border border-stamp-border cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-stamp-orange"
            />
            <div className="flex-1">
              <p className="text-sm text-stamp-white">Notify the winner now</p>
              <p className="text-xs text-stamp-muted-2">
                Sends a WhatsApp (falls back to SMS) the moment you reveal.
              </p>
            </div>
          </label>

          {notify && (
            <div className="space-y-3">
              <Input
                label={`${winner?.display_name ?? "Winner"}'s WhatsApp number`}
                placeholder="0801234..."
                value={winnerPhone}
                onChange={(e) => setWinnerPhone(e.target.value)}
                type="tel"
              />
              <Input
                label="Custom message (optional)"
                placeholder={`Default: "Congratulations, ${winner?.display_name ?? "winner"}! You won..."`}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                hint="Leave blank to use the default congratulations."
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm" role="alert">
              {error}
            </div>
          )}
      </div>

      <div className="sticky bottom-0 bg-stamp-surface border-t border-stamp-border px-5 sm:px-6 pt-4 pb-safe-plus-4 sm:pb-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 sm:justify-start">
        <Button glow size="lg" fullWidth onClick={handleReveal} loading={busy} className="sm:w-auto">
          Reveal {winner?.display_name ?? "winner"} →
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onClose} disabled={busy} className="sm:w-auto">
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
