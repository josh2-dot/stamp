"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StampSeal } from "@/components/ui/StampSeal";
import { formatNaira } from "@/lib/format";

interface VoteFlowProps {
  category: {
    id: string;
    label: string;
    vote_price_kobo: number;
    max_votes_per_voter: number | null;
  };
  nominee: {
    id: string;
    display_name: string;
  };
  eventSlug: string;
  onClose: () => void;
}

/**
 * Voting checkout modal. Two modes on the same form:
 *
 *   - Paid vote (vote_price_kobo > 0): quantity picker with presets,
 *     total shown, Paystack redirect on submit.
 *
 *   - Free poll (vote_price_kobo === 0): quantity hidden, no total,
 *     no "Pay" language. Just phone + name + submit. Backend records
 *     the vote immediately, we show an inline success state (no redirect).
 *
 * The two modes share as much as possible — same layout, same nominee
 * header, same phone/name fields — so it feels like one flow the
 * organizer configured differently, not two products.
 */
export function VoteFlow({ category, nominee, eventSlug, onClose }: VoteFlowProps) {
  const isFree = category.vote_price_kobo === 0;

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // For free polls, quantity is always 1 (max_votes_per_voter enforcement
  // starts at 1). For paid polls, voter chooses.
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Post-submit state for the free-vote confirmation
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const total = category.vote_price_kobo * quantity;
  const presets = [1, 5, 10, 25];

  const handleVote = async () => {
    setError(null);
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!isFree && (quantity < 1 || quantity > 500)) {
      setError("Quantity must be between 1 and 500.");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/awards/vote/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nominee_id: nominee.id,
        voter_phone: phone.trim(),
        voter_name: name.trim() || undefined,
        voter_email: email.trim() || undefined,
        quantity: isFree ? 1 : quantity,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't record vote.");
      setBusy(false);
      return;
    }
    // Free polls: no redirect, show inline confirmation
    if (data.free) {
      setBusy(false);
      setConfirmed(true);
      return;
    }
    // Paid: hand off to Paystack
    window.location.href = data.authorizationUrl;
  };

  // Free-vote confirmation state — the "you voted" moment. Keeps the modal
  // open so the voter can close it themselves (or vote for another nominee
  // in the same category if the cap allows).
  if (confirmed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md">
          <Card accent elevated className="text-center py-10 space-y-5">
            <div className="flex justify-center text-stamp-green">
              <StampSeal size={100} />
            </div>
            <div>
              <Eyebrow align="center" tone="success">
                Vote counted
              </Eyebrow>
              <h2 className="font-display text-display-sm text-stamp-white mt-2 text-balance">
                Your vote for {nominee.display_name} is in.
              </h2>
            </div>
            <p className="text-xs text-stamp-muted-2 max-w-xs mx-auto">
              {category.max_votes_per_voter === 1
                ? "One vote per phone in this category. You're done."
                : `You've used 1 of ${category.max_votes_per_voter ?? "unlimited"} allowed votes in this category.`}
            </p>
            <Button variant="ghost" onClick={onClose} className="mt-2">
              Done
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md">
        <Card className="space-y-5">
          <div>
            <Eyebrow>{isFree ? "Vote for" : "Voting for"}</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-2">
              {nominee.display_name}
            </h2>
            <p className="text-xs text-stamp-muted-2 mt-1">{category.label}</p>
          </div>

          {/* Quantity picker — paid only. Free polls always cast 1 vote,
              cap-enforced server-side. */}
          {!isFree && (
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-stamp-muted-2 mb-3">
                How many votes?
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {presets.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={
                      quantity === q
                        ? "py-3 rounded-md bg-stamp-orange/15 text-stamp-orange border border-stamp-orange font-medium"
                        : "py-3 rounded-md text-stamp-muted-2 border border-stamp-border hover:text-stamp-white hover:border-stamp-muted-2"
                    }
                  >
                    {q}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                value={String(quantity)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) setQuantity(n);
                }}
                hint={`${formatNaira(category.vote_price_kobo)} per vote`}
              />
              {category.max_votes_per_voter && (
                <p className="text-xs text-stamp-muted-2 mt-2">
                  Cap: {category.max_votes_per_voter} votes per phone.
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Your phone"
              placeholder="0801234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              hint={
                isFree
                  ? "One vote per phone number. We don't call or text you."
                  : undefined
              }
            />
            <Input
              label="Your name (optional)"
              placeholder="So the organizer can credit you"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {!isFree && (
              <Input
                label="Email for receipt (optional)"
                placeholder="you@somewhere.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            )}
          </div>

          {/* Total pane — paid only. On free polls it'd read "₦0" which
              is more confusing than helpful. */}
          {!isFree && (
            <div className="flex items-baseline justify-between gap-3 p-4 rounded-md bg-stamp-surface2 border border-stamp-border">
              <span className="text-sm text-stamp-muted-2">Total</span>
              <span className="font-display text-display-sm text-stamp-orange tabular-nums">
                {formatNaira(total)}
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button glow size="lg" onClick={handleVote} loading={busy}>
              {isFree ? "Cast vote →" : "Pay & vote →"}
            </Button>
          </div>
          {!isFree && (
            <p className="text-xs text-stamp-muted-2 text-center">
              Powered by Paystack. Card · transfer · USSD.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
