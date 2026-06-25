"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/landing/TopNav";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PosterPicker } from "@/components/event/PosterPicker";
import { formatNaira } from "@/lib/format";

interface TierDraft {
  id: string;
  name: string;
  price: string;
  service_fee: string;
  capacity: string;
}

const newTier = (): TierDraft => ({
  id: crypto.randomUUID(),
  name: "",
  price: "",
  service_fee: "200",
  capacity: "",
});

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DDTHH:MM
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

    // Parse the local datetime as Lagos time → ISO
    const localDate = new Date(date);
    if (isNaN(localDate.getTime())) {
      setError("Pick a valid date and time.");
      return;
    }

    const parsedTiers = tiers.map((t) => ({
      name: t.name.trim(),
      price_naira: parseFloat(t.price) || 0,
      service_fee_naira: parseFloat(t.service_fee) || 0,
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

      // Upload poster (best-effort — failure doesn't block the redirect)
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
    <>
      <TopNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-stamp-muted hover:text-stamp-white transition-colors mb-6"
        >
          ← All events
        </Link>

        <div className="mb-8">
          <CardLabel>New event</CardLabel>
          <h1 className="text-display text-4xl mt-2">Let's set this up.</h1>
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
              <label className="block text-xs uppercase tracking-[0.18em] text-stamp-muted font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                placeholder="Tell buyers what they're getting into…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-stamp-surface2 border border-stamp-border rounded-md px-3.5 py-2.5 text-sm text-stamp-white placeholder:text-stamp-muted outline-none focus:border-stamp-orange/60 transition-colors resize-y"
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
                <CardLabel>Ticket tiers</CardLabel>
                <p className="text-stamp-muted text-xs mt-1">
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
                    <span className="text-xs uppercase tracking-[0.2em] text-stamp-muted">
                      Tier {idx + 1}
                    </span>
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

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Face value"
                      type="number"
                      inputMode="numeric"
                      placeholder="3000"
                      value={tier.price}
                      onChange={(e) => updateTier(tier.id, { price: e.target.value })}
                      prefix="₦"
                    />
                    <Input
                      label="Service fee"
                      type="number"
                      inputMode="numeric"
                      placeholder="200"
                      value={tier.service_fee}
                      onChange={(e) => updateTier(tier.id, { service_fee: e.target.value })}
                      prefix="₦"
                      hint="STAMP's cut. Buyer pays this on top."
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

                  {tier.price && tier.service_fee && (
                    <p className="text-xs text-stamp-muted pt-1">
                      Buyer pays {formatNaira(
                        (parseFloat(tier.price) + parseFloat(tier.service_fee || "0")) * 100,
                      )}
                      {" · "}You receive {formatNaira(parseFloat(tier.price) * 100)} per ticket
                    </p>
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
            <Button onClick={handleSubmit} loading={submitting} size="lg">
              {submitting ? "Creating…" : "Create event"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
