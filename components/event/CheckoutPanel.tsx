"use client";

import { useState } from "react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StampSeal } from "@/components/ui/StampSeal";
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
          <CardLabel>Your details</CardLabel>
          <h2 className="text-display text-2xl mt-2">Almost there.</h2>
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
          hint="We don't email tickets — Paystack uses this for the receipt only."
        />

        {error && (
          <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
            {error}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={handlePay}
          loading={loading}
        >
          {loading ? "Starting payment…" : `Pay ${formatNaira(total)}`}
        </Button>

        <p className="text-xs text-stamp-muted text-center">
          You'll be redirected to Paystack to complete payment securely.
        </p>
      </Card>

      {/* Summary */}
      <div className="space-y-4">
        <Card accent elevated>
          <CardLabel>Order summary</CardLabel>

          <div className="mt-5 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
              Event
            </p>
            <p className="text-display text-xl text-balance">{event.title}</p>
            <p className="text-stamp-muted text-sm">
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
              <span className="text-stamp-muted">Tier</span>
              <span>{tier.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stamp-muted">Face value</span>
              <span>{formatNaira(tier.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stamp-muted">Service fee</span>
              <span>{formatNaira(tier.service_fee)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stamp-border flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
              You pay
            </span>
            <span className="text-display text-3xl text-stamp-orange">
              {formatNaira(total)}
            </span>
          </div>
        </Card>

        <div className="flex items-center justify-center pt-2 opacity-30">
          <StampSeal size={120} />
        </div>
      </div>
    </div>
  );
}
