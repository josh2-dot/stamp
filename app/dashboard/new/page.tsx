"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PosterPicker } from "@/components/event/PosterPicker";
import { formatNaira } from "@/lib/format";
import { usePlatformFees } from "@/lib/use-platform-fees";

interface TierDraft {
  id: string;
  name: string;
  /** Ticket price (what the organizer receives). STAMP's fee is added on
   *  top silently to produce the buyer-facing total. */
  price: string;
  capacity: string;
}

const newTier = (): TierDraft => ({
  id: crypto.randomUUID(),
  name: "",
  price: "",
  capacity: "",
});

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([
    { ...newTier(), name: "Regular" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTier = (id: string, patch: Partial<TierDraft>) => {
    setTiers((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeTier = (id: string) => {
    setTiers((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  };
  const addTier = () => setTiers((rows) => [...rows, newTier()]);

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim() || !venue.trim() || !date) {
      setError("Title, venue, and date are required.");
      return;
    }

    const localDate = new Date(date);
    if (isNaN(localDate.getTime())) {
      setError("Pick a valid date and time.");
      return;
    }

    const parsedTiers = tiers.map((t) => ({
      name: t.name.trim(),
      price_naira: parseFloat(t.price) || 0,
      capacity: parseInt(t.capacity, 10) || 0,
    }));

    if (parsedTiers.some((t) => !t.name)) {
      setError("Every tier needs a name.");
      return;
    }
    if (parsedTiers.some((t) => t.capacity <= 0)) {
      setError("Every tier needs a capacity greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          venue: venue.trim(),
          description: description.trim() || undefined,
          event_date: localDate.toISOString(),
          tiers: parsedTiers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create event.");
        setSubmitting(false);
        return;
      }

      if (posterFile) {
        try {
          const form = new FormData();
          form.append("file", posterFile);
          await fetch(`/api/events/${data.id}/poster`, {
            method: "POST",
            body: form,
          });
        } catch (uploadErr) {
          console.warn("[new event] poster upload failed", uploadErr);
        }
      }

      router.push(`/dashboard/events/${data.id}`);
    } catch (err) {
      console.error(err);
      setError("Network problem. Check your connection.");
      setSubmitting(false);
    }
  };

  return (
    <PageShell maxWidth="lg">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors mb-6"
      >
        ← All events
      </Link>

      <div className="mb-8">
        <Eyebrow>New event</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          Let's set this up.
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="space-y-5">
          <Input
            label="Event title"
            placeholder="e.g. RSU Carnival 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Venue"
            placeholder="e.g. SUB Field, Rivers State University"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
          <Input
            label="Date & time"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            hint="Lagos time. We display this to buyers in WAT."
          />
          <div>
            {/* Was: text-xs uppercase tracking-[0.18em] inline (0.18 was one of
                three tracking values the audit called out). Eyebrow now. */}
            <Eyebrow as="label" htmlFor="event-description" className="block mb-2">
              Description (optional)
            </Eyebrow>
            <textarea
              id="event-description"
              placeholder="Tell buyers what they're getting into…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-stamp-surface2 border border-stamp-border rounded-md px-3.5 py-2.5 text-sm text-stamp-white placeholder:text-stamp-muted outline-none focus:border-stamp-orange/50 transition-colors resize-y"
            />
          </div>

          <PosterPicker
            pendingFile={posterFile}
            onPendingFileChange={setPosterFile}
            allowRemove
          />
        </Card>

        {/* Tiers */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Ticket tiers</Eyebrow>
              <p className="text-stamp-muted-2 text-xs mt-1">
                Add one or more. Buyers see them all on the event page.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={addTier}>
              + Add tier
            </Button>
          </div>

          <div className="space-y-3">
            {tiers.map((tier, idx) => (
              <div
                key={tier.id}
                className="rounded-lg border border-stamp-border bg-stamp-surface2 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Eyebrow>Tier {idx + 1}</Eyebrow>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      className="text-xs text-stamp-red hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <Input
                  label="Name"
                  placeholder="e.g. Regular, VIP, Table for 4"
                  value={tier.name}
                  onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ticket price"
                    type="number"
                    inputMode="numeric"
                    placeholder="3000"
                    value={tier.price}
                    onChange={(e) => updateTier(tier.id, { price: e.target.value })}
                    prefix="₦"
                    hint="What buyers pay. No add-ons at checkout."
                  />
                  <Input
                    label="Capacity"
                    type="number"
                    inputMode="numeric"
                    placeholder="200"
                    value={tier.capacity}
                    onChange={(e) => updateTier(tier.id, { capacity: e.target.value })}
                  />
                </div>

                {tier.price && parseFloat(tier.price) > 0 && (
                  // Net-to-organizer surfaces prominently so the platform fee
                  // is never a surprise at payout time. Organizers see exactly
                  // what they'll receive per ticket sold.
                  <PayoutPreview priceNaira={parseFloat(tier.price)} />
                )}
              </div>
            ))}
          </div>
        </Card>

        {error && (
          <div className="p-4 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard">
            <Button variant="ghost">Cancel</Button>
          </Link>
          {/* glow — the one primary action on the page; spinner is the loading
              signal alone (no more "Creating…" label change duplicating it) */}
          <Button onClick={handleSubmit} loading={submitting} size="lg" glow>
            Create event
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Tier payout breakdown. Mirrors the math STAMP runs at sale time so the
 * organizer sees, before the event is even created, exactly what they net.
 * Sub-₦1,500 tickets show a warning because the ₦200 base fee bites hard
 * at low prices.
 */
function PayoutPreview({ priceNaira }: { priceNaira: number }) {
  const { fees, feeFor, buyerTotalFor } = usePlatformFees();
  const priceKobo = Math.round(priceNaira * 100);
  const feeKobo = feeFor(priceKobo);
  const buyerKobo = buyerTotalFor(priceKobo);
  const effectiveRate = priceKobo > 0 ? (feeKobo / priceKobo) * 100 : 0;
  const steep = effectiveRate > 15;

  const baseNaira = fees.base / 100;
  const ratePct = fees.rate / 100;
  const feeFormula = `₦${baseNaira.toLocaleString()} + ${ratePct}%`;
  // Custom-rate organizers get a small accent so they know their numbers
  // aren't the standard ones.
  const feeLabel = fees.overridden
    ? `Your custom rate (${feeFormula})`
    : `STAMP's ${feeFormula}`;

  return (
    <div className="pt-3 mt-1 border-t border-stamp-border space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-stamp-white font-medium">You receive</span>
        <span className="text-stamp-orange font-display tabular-nums">
          {formatNaira(priceKobo)}
        </span>
      </div>
      <div className="flex justify-between pt-1.5 border-t border-stamp-border">
        <span className="text-stamp-muted-2">Buyer sees</span>
        <span className="text-stamp-muted-2 tabular-nums">{formatNaira(buyerKobo)}</span>
      </div>
      <p className="text-[11px] text-stamp-muted-2">
        {feeLabel} ({formatNaira(feeKobo)}) is added silently on top.
      </p>
      {steep && (
        <p className="text-stamp-gold text-[11px] pt-1.5 border-t border-stamp-border">
          Heads up — STAMP's fee adds {effectiveRate.toFixed(0)}% to your price,
          so buyers see {formatNaira(buyerKobo)}, not {formatNaira(priceKobo)}.
          Consider ₦1,500+ tickets for cleaner buyer-facing prices.
        </p>
      )}
    </div>
  );
}
