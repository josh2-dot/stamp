"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PosterPicker } from "@/components/event/PosterPicker";
import { formatNaira } from "@/lib/format";
import { usePlatformFees } from "@/lib/use-platform-fees";
import type { EditEventResponse } from "@/types";

interface ExistingTier {
  id: string;
  name: string;
  price: number;         // kobo
  service_fee: number;   // kobo
  capacity: number;
  sold: number;
  sort_order: number;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  event_date: string;
  slug: string;
  is_active: boolean;
  poster_url: string | null;
}

interface TierDraft {
  id?: string;           // present when editing an existing tier
  localKey: string;      // stable key for React list rendering
  name: string;
  /** Ticket price in naira (form-level string). STAMP fee is server-computed. */
  price: string;
  capacity: string;
  sold: number;          // read-only — drives validation rules
}

const newTier = (): TierDraft => ({
  localKey: crypto.randomUUID(),
  name: "",
  price: "",
  capacity: "",
  sold: 0,
});

// Convert from input local-datetime back/forth using WAT (UTC+1, no DST).
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const wat = new Date(d.getTime() + 60 * 60 * 1000); // UTC → WAT
  return wat.toISOString().slice(0, 16);
}

function localInputToIso(local: string): string {
  // Treat the value as WAT, convert back to UTC for storage
  const d = new Date(local);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return new Date(d.getTime() - 60 * 60 * 1000).toISOString();
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventData | null>(null);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [originalTiers, setOriginalTiers] = useState<ExistingTier[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Deactivate flow
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/events/${params.id}`);
        if (!res.ok) {
          setLoadError(res.status === 404 ? "Event not found." : "Couldn't load event.");
          return;
        }
        const { event: ev, tiers: dbTiers } = (await res.json()) as {
          event: EventData;
          tiers: ExistingTier[];
        };
        if (cancelled) return;

        setEvent(ev);
        setTitle(ev.title);
        setVenue(ev.venue);
        setDescription(ev.description ?? "");
        setDate(isoToLocalInput(ev.event_date));

        setOriginalTiers(dbTiers);
        setTiers(
          dbTiers.map((t) => ({
            id: t.id,
            localKey: t.id,
            name: t.name,
            price: String(t.price / 100),
            capacity: String(t.capacity),
            sold: t.sold,
          })),
        );
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError("Network problem.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const updateTier = (key: string, patch: Partial<TierDraft>) => {
    setTiers((rows) =>
      rows.map((r) => (r.localKey === key ? { ...r, ...patch } : r)),
    );
  };
  const removeTier = (key: string) => {
    setTiers((rows) =>
      rows.length > 1 ? rows.filter((r) => r.localKey !== key) : rows,
    );
  };
  const addTier = () => setTiers((rows) => [...rows, newTier()]);

  // Poster file change → immediate upload (independent of the text-field save).
  // Treats poster as its own atomic operation rather than coupling it to the
  // PATCH endpoint, which keeps the multipart concerns out of the JSON API.
  const handlePosterChange = async (file: File | null) => {
    setPosterError(null);
    setPosterFile(file);
    if (!file || !event) return;

    setPosterUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/events/${params.id}/poster`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setPosterError(data.error || "Couldn't upload poster.");
        setPosterFile(null);
        return;
      }
      setEvent({ ...event, poster_url: data.poster_url });
      setPosterFile(null); // clear pending — preview now driven by initialUrl
    } catch (err) {
      console.error(err);
      setPosterError("Network problem.");
      setPosterFile(null);
    } finally {
      setPosterUploading(false);
    }
  };

  const handlePosterRemove = async () => {
    if (!event) return;
    setPosterError(null);
    setPosterUploading(true);
    try {
      const res = await fetch(`/api/events/${params.id}/poster`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPosterError(data.error || "Couldn't remove poster.");
        return;
      }
      setEvent({ ...event, poster_url: null });
    } catch (err) {
      console.error(err);
      setPosterError("Network problem.");
    } finally {
      setPosterUploading(false);
    }
  };

  const dirty = useMemo(() => {
    if (!event) return false;
    if (title.trim() !== event.title) return true;
    if (venue.trim() !== event.venue) return true;
    if ((description.trim() || null) !== (event.description ?? null)) return true;
    if (date && localInputToIso(date) !== event.event_date) return true;

    // Tier-level diff
    if (tiers.length !== originalTiers.length) return true;
    for (const t of tiers) {
      if (!t.id) return true;
      const orig = originalTiers.find((o) => o.id === t.id);
      if (!orig) return true;
      if (orig.name !== t.name.trim()) return true;
      if (orig.price !== Math.round(parseFloat(t.price || "0") * 100)) return true;
      if (orig.capacity !== parseInt(t.capacity || "0", 10)) return true;
    }
    return false;
  }, [event, title, venue, description, date, tiers, originalTiers]);

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);

    if (!title.trim() || !venue.trim() || !date) {
      setSaveError("Title, venue, and date are required.");
      return;
    }

    const parsedTiers = tiers.map((t, i) => ({
      id: t.id,
      name: t.name.trim(),
      price_naira: parseFloat(t.price) || 0,
      capacity: parseInt(t.capacity, 10) || 0,
      sort_order: i,
    }));

    if (parsedTiers.some((t) => !t.name)) {
      setSaveError("Every tier needs a name.");
      return;
    }
    if (parsedTiers.some((t) => t.capacity <= 0)) {
      setSaveError("Every tier needs a capacity greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          venue: venue.trim(),
          description: description.trim() || null,
          event_date: localInputToIso(date),
          tiers: parsedTiers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Couldn't save.");
        setSaving(false);
        return;
      }
      // Re-fetch to refresh original state + sold counts
      const refresh = await fetch(`/api/events/${params.id}`);
      const fresh = await refresh.json();
      setEvent(fresh.event);
      setOriginalTiers(fresh.tiers);
      setTiers(
        fresh.tiers.map((t: ExistingTier) => ({
          id: t.id,
          localKey: t.id,
          name: t.name,
          price: String(t.price / 100),
          capacity: String(t.capacity),
          sold: t.sold,
        })),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      setSaveError("Network problem.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!event) return;
    setToggling(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !event.is_active }),
      });
      const data = (await res.json()) as EditEventResponse | { error: string };
      if (!res.ok || "error" in data) {
        setSaveError(("error" in data && data.error) || "Couldn't change status.");
        setToggling(false);
        return;
      }
      setEvent({ ...event, is_active: data.is_active });
      setConfirmDeactivate(false);
    } catch (err) {
      console.error(err);
      setSaveError("Network problem.");
    } finally {
      setToggling(false);
    }
  };

  if (loadError) {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center">
          <h1 className="font-display text-display-md text-stamp-white">{loadError}</h1>
          <Link href="/dashboard" className="text-stamp-orange mt-6 inline-block hover:underline">
            ← Back to events
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell maxWidth="lg">
        <div className="animate-stamp-pulse space-y-4">
          <div className="h-8 w-48 bg-stamp-surface rounded-md" />
          <div className="h-64 bg-stamp-surface rounded-lg" />
          <div className="h-64 bg-stamp-surface rounded-lg" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="lg">
      <Link
        href={`/dashboard/events/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-stamp-muted-2 hover:text-stamp-white transition-colors mb-6"
      >
        ← Back to dashboard
      </Link>

      <div className="flex items-start justify-between gap-4 mb-10 flex-wrap">
        <div>
          <Eyebrow>Editing</Eyebrow>
          <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2 text-balance">
            {event.title}
          </h1>
        </div>
        {/* "Live" = active sales, not gate verification. Default tone + dot. */}
        <Badge tone={event.is_active ? "default" : "warning"} dot={event.is_active}>
          {event.is_active ? "Live" : "Deactivated"}
        </Badge>
      </div>

      {!event.is_active && (
        // Was: className="border-stamp-gold/40 bg-stamp-gold/5" — one-off
        // override replaced with tone="warning" Card variant.
        <Card className="mb-6 bg-stamp-gold/5" tone="warning">
          <Eyebrow className="!text-stamp-gold">Deactivated</Eyebrow>
          <p className="text-sm mt-1 text-stamp-white">
            The public event page is hidden and no new tickets can be sold. Existing tickets still work at the scanner. Reactivate to put it back on sale.
          </p>
        </Card>
      )}

        <div className="space-y-6">
          {/* Event details */}
          <Card className="space-y-5">
            <Eyebrow>Event details</Eyebrow>
            <Input
              label="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
            <Input
              label="Date & time"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              hint="Lagos time (WAT)."
            />
            <div>
              <Eyebrow as="label" htmlFor="edit-description" className="block mb-2">
                Description
              </Eyebrow>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-stamp-surface2 border border-stamp-border rounded-md px-3.5 py-2.5 text-sm text-stamp-white placeholder:text-stamp-muted outline-none focus:border-stamp-orange/50 transition-colors resize-y"
              />
            </div>

            <PosterPicker
              initialUrl={event.poster_url}
              pendingFile={posterFile}
              onPendingFileChange={handlePosterChange}
              onRemove={handlePosterRemove}
              uploading={posterUploading}
              error={posterError}
            />
          </Card>

          {/* Tiers */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Eyebrow>Ticket tiers</Eyebrow>
                <p className="text-stamp-muted-2 text-xs mt-1">
                  You can't drop a tier's capacity below tickets already sold, or remove a tier with sales.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addTier}>
                + Add tier
              </Button>
            </div>

            <div className="space-y-3">
              {tiers.map((tier, idx) => {
                const hasSales = tier.sold > 0;
                const capacityNum = parseInt(tier.capacity || "0", 10);
                const capacityTooLow = hasSales && capacityNum < tier.sold;

                return (
                  <div
                    key={tier.localKey}
                    className="rounded-lg border border-stamp-border bg-stamp-surface2 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Eyebrow as="span">
                        Tier {idx + 1}
                        {!tier.id && (
                          <span className="ml-2 text-stamp-orange normal-case tracking-normal">
                            new
                          </span>
                        )}
                      </Eyebrow>
                      <div className="flex items-center gap-3">
                        {hasSales && (
                          <Badge tone="success">{tier.sold} sold</Badge>
                        )}
                        {!hasSales && tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTier(tier.localKey)}
                            className="text-xs text-stamp-red hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <Input
                      label="Name"
                      value={tier.name}
                      onChange={(e) => updateTier(tier.localKey, { name: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Ticket price"
                        type="number"
                        inputMode="numeric"
                        value={tier.price}
                        onChange={(e) => updateTier(tier.localKey, { price: e.target.value })}
                        prefix="₦"
                        hint="What buyers pay."
                      />
                      <Input
                        label="Capacity"
                        type="number"
                        inputMode="numeric"
                        value={tier.capacity}
                        onChange={(e) => updateTier(tier.localKey, { capacity: e.target.value })}
                        error={capacityTooLow ? `Min ${tier.sold}` : undefined}
                      />
                    </div>

                    {tier.price && parseFloat(tier.price) > 0 && (
                      <PayoutPreview priceNaira={parseFloat(tier.price)} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {saveError && (
            <div className="p-4 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Destructive zone on the left */}
            <div>
              {event.is_active ? (
                confirmDeactivate ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stamp-muted-2">Confirm?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleToggleActive}
                      loading={toggling}
                    >
                      Yes, deactivate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeactivate(false)}
                      disabled={toggling}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeactivate(true)}
                    className="text-stamp-red hover:bg-stamp-red/10"
                  >
                    Deactivate event
                  </Button>
                )
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleActive}
                  loading={toggling}
                >
                  Reactivate event
                </Button>
              )}
            </div>

            {/* Save actions on the right */}
            <div className="flex items-center gap-3">
              {saved && <Badge tone="success">Saved</Badge>}
              <Link href={`/dashboard/events/${params.id}`}>
                <Button variant="ghost" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              {/* glow when dirty — the one primary action on the page right now */}
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!dirty}
                variant={dirty ? "primary" : "secondary"}
                glow={dirty}
                size="lg"
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
    </PageShell>
  );
}

/**
 * Same payout-preview component as in /dashboard/new — kept duplicated rather
 * than extracted because both pages have slightly different surrounding
 * context (new event = first impression, edit = post-creation tweak) and a
 * shared component would over-couple them. Both rely on lib/fee-rules.ts for
 * the actual math, so the displayed numbers can't drift.
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
        STAMP's {feeFormula} ({formatNaira(feeKobo)}) is added silently on top.
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
