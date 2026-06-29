"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
 * Voting checkout modal. Collects voter phone + quantity, calls
 * /api/awards/vote/init which kicks off Paystack, and redirects.
 *
 * The quantity stepper is the headline UI — vote packs are the wallet-
 * opening moment. We show common quantities (1, 5, 10, 25) as buttons
 * with cost calculations, plus a manual input for whales.
 */
export function VoteFlow({ category, nominee, eventSlug, onClose }: VoteFlowProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (quantity < 1 || quantity > 500) {
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
        quantity,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't start payment.");
      setBusy(false);
      return;
    }
    // Hand off to Paystack
    window.location.href = data.authorizationUrl;
  };

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
            <Eyebrow>Voting for</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-2">
              {nominee.display_name}
            </h2>
            <p className="text-xs text-stamp-muted-2 mt-1">{category.label}</p>
          </div>

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

          <div className="space-y-3 pt-3 border-t border-stamp-border">
            <Input
              label="Your phone"
              placeholder="0801234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
            <Input
              label="Your name (optional)"
              placeholder="So the organizer can credit you"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email for receipt (optional)"
              placeholder="you@somewhere.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>

          <div className="flex items-baseline justify-between gap-3 p-4 rounded-md bg-stamp-surface2 border border-stamp-border">
            <span className="text-sm text-stamp-muted-2">Total</span>
            <span className="font-display text-display-sm text-stamp-orange tabular-nums">
              {formatNaira(total)}
            </span>
          </div>

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
              Pay & vote →
            </Button>
          </div>
          <p className="text-xs text-stamp-muted-2 text-center">
            Powered by Paystack. Card · transfer · USSD.
          </p>
        </Card>
      </div>
    </div>
  );
}
