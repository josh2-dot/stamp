"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { TicketTier } from "@/types";

interface CompTicketCardProps {
  eventId: string;
  tiers: TicketTier[];
  onIssued?: () => void;
}

type State = "idle" | "submitting" | "issued" | "error";

/**
 * Comp ticket issuer. Sits in the event dashboard sidebar. Form is inline
 * (not a modal) because Lymora prefers tactile, low-friction surfaces — a
 * modal adds a layer of state for what's a 4-field form.
 *
 * Issues a free ticket via /api/events/[id]/comp. The recipient gets the
 * same SMS + (optional) email the paid buyers get; the door scanner
 * admits identically. The "comp" status is internal accounting.
 */
export function CompTicketCard({ eventId, tiers, onIssued }: CompTicketCardProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastIssuedTo, setLastIssuedTo] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    setError(null);
    setState("idle");
  };

  const handleIssue = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Recipient name is required.");
      setState("error");
      return;
    }
    if (!phone.trim()) {
      setError("Recipient phone is required.");
      setState("error");
      return;
    }
    if (!tierId) {
      setError("Pick a tier.");
      setState("error");
      return;
    }

    setState("submitting");
    try {
      const res = await fetch(`/api/events/${eventId}/comp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_id: tierId,
          buyer_name: name.trim(),
          buyer_phone: phone.trim(),
          buyer_email: email.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't issue comp.");
        setState("error");
        return;
      }
      setLastIssuedTo(name.trim());
      setState("issued");
      reset();
      onIssued?.();
      // Auto-close the form after success so the next comp starts fresh
      setTimeout(() => {
        setOpen(false);
        setLastIssuedTo(null);
      }, 4000);
    } catch (err) {
      console.error(err);
      setError("Network problem.");
      setState("error");
    }
  };

  if (!open) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Eyebrow>Comp tickets</Eyebrow>
            <p className="text-xs text-stamp-muted-2 mt-1">
              Free entry for lecturers, sponsors, media, VIPs.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            + Issue comp
          </Button>
        </div>
        {state === "issued" && lastIssuedTo && (
          <div className="mt-3 pt-3 border-t border-stamp-border flex items-center gap-2">
            <Badge tone="success" dot>
              Sent
            </Badge>
            <span className="text-xs text-stamp-muted-2">
              Comp delivered to {lastIssuedTo}.
            </span>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <Eyebrow>Issue comp ticket</Eyebrow>
          <p className="text-xs text-stamp-muted-2 mt-1">
            Recipient gets the same SMS + QR a paying buyer would.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-stamp-muted-2 hover:text-stamp-white"
        >
          Cancel
        </button>
      </div>

      <Input
        label="Recipient name"
        placeholder="Dr. Adekunle, sponsor name, etc."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="WhatsApp number"
          placeholder="0801234..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
        />
        <Input
          label="Email (optional)"
          placeholder="them@somewhere.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </div>

      {tiers.length > 1 && (
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-stamp-muted-2 mb-2">
            Tier
          </label>
          <div className="flex flex-wrap gap-2">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierId(t.id)}
                className={
                  tierId === t.id
                    ? "px-3 py-1.5 rounded-md text-sm bg-stamp-orange/15 text-stamp-orange border border-stamp-orange/30"
                    : "px-3 py-1.5 rounded-md text-sm text-stamp-muted-2 border border-stamp-border hover:text-stamp-white"
                }
                disabled={t.sold >= t.capacity}
              >
                {t.name}
                {t.sold >= t.capacity && " (full)"}
              </button>
            ))}
          </div>
        </div>
      )}

      <Input
        label="Reason (optional)"
        placeholder="Faculty advisor · TechCorp sponsor · etc."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="Shows in admin lookup. Helps the bouncer too if you forward the SMS to them."
      />

      {state === "error" && error && (
        <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-stamp-border">
        <Button
          onClick={handleIssue}
          loading={state === "submitting"}
          glow
        >
          Issue + send
        </Button>
      </div>
    </Card>
  );
}
