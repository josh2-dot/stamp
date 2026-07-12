"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
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
 * Voting checkout. Two modes on the same form:
 *   - Paid vote: quantity picker with presets, total shown, Paystack redirect.
 *   - Free poll: quantity hidden, no total, inline success state instead
 *     of Paystack.
 *
 * Uses Sheet primitive so on mobile the Cast/Pay CTA lands in the thumb
 * zone with safe-area padding. Desktop keeps the centered-modal look.
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
  const [confirmed, setConfirmed] = useState(false);

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
    if (data.free) {
      setBusy(false);
      setConfirmed(true);
      return;
    }
    window.location.href = data.authorizationUrl;
  };

  if (confirmed) {
    return (
      <Sheet open onClose={onClose} maxWidth="md" ariaLabel="Vote confirmed">
        <div className="p-6 sm:p-8 text-center space-y-5">
          <div className="flex justify-center text-stamp-green">
            <StampSeal size={100} />
          </div>
          <div>
            <Eyebrow align="center" tone="success">Vote counted</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-2 text-balance">
              Your vote for {nominee.display_name} is in.
            </h2>
          </div>
          <p className="text-sm text-stamp-muted-2 max-w-xs mx-auto text-pretty">
            {category.max_votes_per_voter === 1
              ? "One vote per phone in this category. You're done."
              : `You've used 1 of ${category.max_votes_per_voter ?? "unlimited"} allowed votes in this category.`}
          </p>
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>Done</Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      maxWidth="md"
      dismissible={!busy}
      ariaLabel={`Vote for ${nominee.display_name}`}
    >
      <div className="sticky top-0 bg-stamp-surface z-10 px-5 sm:px-6 pt-4 pb-3 border-b border-stamp-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>{isFree ? "Vote for" : "Voting for"}</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-1.5 truncate">
              {nominee.display_name}
            </h2>
            <p className="text-xs text-stamp-muted-2 mt-1 truncate">{category.label}</p>
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
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
        {!isFree && (
          <div>
            <Eyebrow className="mb-3 block">How many votes?</Eyebrow>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {presets.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={
                    quantity === q
                      ? "min-h-[48px] rounded-md bg-stamp-orange/15 text-stamp-orange border border-stamp-orange font-medium text-base"
                      : "min-h-[48px] rounded-md text-stamp-muted-2 border border-stamp-border hover:text-stamp-white hover:border-stamp-muted-2 text-base"
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
            inputMode="tel"
            autoComplete="tel"
            hint={isFree ? "One vote per phone number. We don't call or text you." : undefined}
          />
          <Input
            label="Your name (optional)"
            placeholder="So the organizer can credit you"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          {!isFree && (
            <Input
              label="Email for receipt (optional)"
              placeholder="you@somewhere.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          )}
        </div>

        {!isFree && (
          <div className="flex items-baseline justify-between gap-3 p-4 rounded-md bg-stamp-surface2 border border-stamp-border">
            <span className="text-sm text-stamp-muted-2">Total</span>
            <span className="font-display text-display-sm text-stamp-orange tabular-nums">
              {formatNaira(total)}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-stamp-surface border-t border-stamp-border px-5 sm:px-6 pt-4 pb-safe-plus-4 sm:pb-4 space-y-2">
        <Button glow size="lg" fullWidth onClick={handleVote} loading={busy}>
          {isFree ? "Cast vote →" : "Pay & vote →"}
        </Button>
        {!isFree && (
          <p className="text-xs text-stamp-muted-2 text-center">
            Powered by Paystack. Card · transfer · USSD.
          </p>
        )}
      </div>
    </Sheet>
  );
}