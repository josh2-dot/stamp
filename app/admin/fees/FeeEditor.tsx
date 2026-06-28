"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";

interface FeeEditorProps {
  initialBaseKobo: number;
  initialRateBps: number;
}

type State = "idle" | "confirming" | "saving" | "saved" | "error";

export function FeeEditor({ initialBaseKobo, initialRateBps }: FeeEditorProps) {
  const router = useRouter();
  // Form state in human units (naira + percent), converted to kobo/bps on save.
  const [baseNaira, setBaseNaira] = useState(String(initialBaseKobo / 100));
  const [ratePct, setRatePct] = useState(String(initialRateBps / 100));
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const parsedBaseKobo = Math.round((parseFloat(baseNaira) || 0) * 100);
  const parsedRateBps = Math.round((parseFloat(ratePct) || 0) * 100);

  const dirty =
    parsedBaseKobo !== initialBaseKobo || parsedRateBps !== initialRateBps;

  // Quick sanity preview at a few sample prices so the admin sees what they're
  // about to ship before confirming. Picked to cover the campus-event sweet
  // spot plus an outlier on each end.
  const samples = [500, 1500, 3000, 10000].map((priceNaira) => {
    const priceKobo = priceNaira * 100;
    const feeKobo =
      parsedBaseKobo + Math.round((priceKobo * parsedRateBps) / 10000);
    return {
      priceNaira,
      priceKobo,
      feeKobo,
      buyerKobo: priceKobo + feeKobo,
      effRate: (feeKobo / priceKobo) * 100,
    };
  });

  const handleSave = async () => {
    setError(null);

    if (!Number.isFinite(parsedBaseKobo) || parsedBaseKobo < 0) {
      setError("Base fee must be a non-negative number.");
      setState("error");
      return;
    }
    if (!Number.isFinite(parsedRateBps) || parsedRateBps < 0) {
      setError("Rate must be a non-negative percentage.");
      setState("error");
      return;
    }
    if (parsedRateBps > 10_000) {
      setError("Rate can't exceed 100%.");
      setState("error");
      return;
    }

    setState("saving");
    try {
      const res = await fetch("/api/admin/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_base_kobo: parsedBaseKobo,
          fee_rate_bps: parsedRateBps,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed.");
        setState("error");
        return;
      }
      setState("saved");
      setNote("");
      // Server-render the page again so the new values appear in the
      // "worked examples" + cache prime.
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setError("Network problem.");
      setState("error");
    }
  };

  return (
    <Card accent={dirty} elevated tone={dirty ? "warning" : "default"} className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Eyebrow accent={dirty}>Fee values</Eyebrow>
        {state === "saved" && <Badge tone="success">Saved</Badge>}
        {dirty && state !== "saved" && <Badge tone="warning">Unsaved changes</Badge>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Base fee per ticket"
          type="number"
          inputMode="decimal"
          value={baseNaira}
          onChange={(e) => setBaseNaira(e.target.value)}
          prefix="₦"
          hint="Flat amount added to every ticket sold."
        />
        <Input
          label="Variable rate"
          type="number"
          inputMode="decimal"
          value={ratePct}
          onChange={(e) => setRatePct(e.target.value)}
          suffix="%"
          hint="Percentage of the organizer's price."
        />
      </div>

      {/* Live preview at sample prices — shows whether the new rates make
          sense before the admin commits. Catches "set 30% by accident". */}
      {dirty && (
        <div className="p-4 rounded-md bg-stamp-surface2 border border-stamp-border">
          <Eyebrow>Preview at sample prices</Eyebrow>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {samples.map((s) => (
              <div key={s.priceNaira} className="space-y-0.5">
                <p className="text-stamp-muted-2">
                  Org sets <span className="text-stamp-white">{formatNaira(s.priceKobo)}</span>
                </p>
                <p className="text-stamp-orange tabular-nums">
                  Buyer: {formatNaira(s.buyerKobo)}
                </p>
                <p className={s.effRate > 15 ? "text-stamp-gold" : "text-stamp-muted-2"}>
                  ({s.effRate.toFixed(0)}% effective)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Input
        label="Reason for change (optional)"
        placeholder="e.g. Dropping base fee for sub-₦1k tickets"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="Saved to the audit log alongside this change."
      />

      {error && (
        <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-stamp-border">
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setBaseNaira(String(initialBaseKobo / 100));
              setRatePct(String(initialRateBps / 100));
              setNote("");
              setError(null);
              setState("idle");
            }}
            disabled={state === "saving"}
          >
            Reset
          </Button>
        )}
        <Button
          onClick={handleSave}
          loading={state === "saving"}
          disabled={!dirty}
          glow={dirty}
          size="lg"
        >
          Apply new fees
        </Button>
      </div>
    </Card>
  );
}
