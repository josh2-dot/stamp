"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatNaira, validateNigerianPhone } from "@/lib/format";
import type { Event, TicketTier, CheckoutResponse } from "@/types";

interface CheckoutPanelProps {
  event: Event;
  tier: TicketTier;
}

export function CheckoutPanel({ event, tier }: CheckoutPanelProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buyer's total = organizer price + STAMP fee. Presented as a single
  // number; no breakdown shown anywhere in the buyer flow.
  const total = tier.price + tier.service_fee;

  const handlePay = async () => {
    setError(null);

    if (!buyerName.trim()) {
      setError("We need a name on the ticket.");
      return;
    }
    if (!validateNigerianPhone(buyerPhone)) {
      setError("Enter a valid Nigerian phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: tier.id,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't start payment. Try again.");
        setLoading(false);
        return;
      }

      const { authorizationUrl } = data as CheckoutResponse;
      window.location.href = authorizationUrl;
    } catch (err) {
      console.error(err);
      setError("Network problem. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* Form */}
      <Card className="space-y-5">
        <div>
          <Eyebrow>Your details</Eyebrow>
          {/* Was text-2xl — the audit's named example. The buy moment deserves
              the section-headline scale, not card-header scale. */}
          <h2 className="font-display text-display-md text-stamp-white mt-2 text-balance">
            Almost there.
          </h2>
        </div>

        <Input
          label="Full name"
          placeholder="The name to put on the ticket"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          autoComplete="name"
        />

        <Input
          label="WhatsApp number"
          placeholder="0801 234 5678"
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          prefix="+234"
          hint="Your ticket QR will be sent here within seconds of payment."
        />

        <Input
          label="Email (optional)"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          hint="We'll send your ticket here too. Paystack also uses it for the payment receipt."
        />

        {error && (
          <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
            {error}
          </div>
        )}

        {/* glow + label stays semantic; spinner carries the loading signal alone.
            Was: {loading ? "Starting payment…" : `Pay ${total}`} — both states + dim
            + spinner was three loading cues for one action. */}
        <Button
          fullWidth
          size="lg"
          glow
          onClick={handlePay}
          loading={loading}
        >
          Pay {formatNaira(total)}
        </Button>

        <p className="text-xs text-stamp-muted-2 text-center">
          You'll be redirected to Paystack to complete payment securely.
        </p>
      </Card>

      {/* Summary */}
      <div className="space-y-4">
        <Card accent elevated>
          <Eyebrow>Order summary</Eyebrow>

          <div className="mt-5 space-y-2">
            <Eyebrow>Event</Eyebrow>
            <p className="font-display text-display-xs text-stamp-white text-balance">
              {event.title}
            </p>
            <p className="text-stamp-muted-2 text-sm">
              {new Date(event.event_date).toLocaleDateString("en-NG", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {event.venue}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-stamp-border space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stamp-muted-2">Tier</span>
              <span>{tier.name}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stamp-border flex items-baseline justify-between">
            <Eyebrow>You pay</Eyebrow>
            <span className="font-display text-display-sm text-stamp-orange">
              {formatNaira(total)}
            </span>
          </div>
        </Card>

        {/* Decorative seal removed — the seal belongs on the success page,
            which IS the verification moment. Putting it here as wallpaper at
            30% opacity dilutes its impact when it actually fires. */}
      </div>
    </div>
  );
}
