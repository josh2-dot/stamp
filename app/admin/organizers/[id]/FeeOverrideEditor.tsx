"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";

interface FeeOverrideEditorProps {
  organizerId: string;
  organizerName: string;
  /** Current override (null when using platform default) */
  initialBaseKobo: number | null;
  initialRateBps: number | null;
  /** Platform defaults — for comparison + restore */
  defaultBaseKobo: number;
  defaultRateBps: number;
}

type State =
  | "idle"
  | "submitting"
  | "saved_set"
  | "saved_cleared"
  | "error";

export function FeeOverrideEditor({
  organizerId,
  organizerName,
  initialBaseKobo,
  initialRateBps,
  defaultBaseKobo,
  defaultRateBps,
}: FeeOverrideEditorProps) {
  const router = useRouter();
  const initialHasOverride =
    initialBaseKobo !== null && initialRateBps !== null;

  // If no override, prefill inputs with the platform default — easier to
  // adjust from a known starting point than from blanks.
  const [baseNaira, setBaseNaira] = useState(
    String((initialBaseKobo ?? defaultBaseKobo) / 100),
  );
  const [ratePct, setRatePct] = useState(
    String((initialRateBps ?? defaultRateBps) / 100),
  );
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const parsedBaseKobo = Math.round((parseFloat(baseNaira) || 0) * 100);
  const parsedRateBps = Math.round((parseFloat(ratePct) || 0) * 100);

  // "Dirty" = the proposed values differ from what's currently saved.
  // When no override is currently set, ANY entry that doesn't match the
  // default is a new override.
  const dirty = initialHasOverride
    ? parsedBaseKobo !== initialBaseKobo || parsedRateBps !== initialRateBps
    : parsedBaseKobo !== defaultBaseKobo || parsedRateBps !== defaultRateBps;

  const matchesDefault =
    parsedBaseKobo === defaultBaseKobo && parsedRateBps === defaultRateBps;

  // Quick preview at sample prices
  const samples = [1000, 3000, 10000].map((priceNaira) => {
    const priceKobo = priceNaira * 100;
    const feeKobo =
      parsedBaseKobo + Math.round((priceKobo * parsedRateBps) / 10000);
    return {
      priceNaira,
      priceKobo,
      feeKobo,
      buyerKobo: priceKobo + feeKobo,
    };
  });

  const handleApply = async () => {
    setError(null);
    if (!Number.isFinite(parsedBaseKobo) || parsedBaseKobo < 0) {
      setError("Base fee must be a non-negative number.");
      setState("error");
      return;
    }
    if (
      !Number.isFinite(parsedRateBps) ||
      parsedRateBps < 0 ||
      parsedRateBps > 10_000
    ) {
      setError("Rate must be between 0% and 100%.");
      setState("error");
      return;
    }

    setState("submitting");
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}/fee`, {
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
      setState("saved_set");
      setNote("");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setError("Network problem.");
      setState("error");
    }
  };

  const handleClear = async () => {
    if (!initialHasOverride) return;
    setError(null);
    setState("submitting");
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}/fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_base_kobo: null,
          fee_rate_bps: null,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed.");
        setState("error");
        return;
      }
      setState("saved_cleared");
      setNote("");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setError("Network problem.");
      setState("error");
    }
  };

  return (
    <Card
      accent={initialHasOverride}
      elevated
      tone={initialHasOverride ? "warning" : "default"}
      className="space-y-5"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Eyebrow accent={initialHasOverride}>Fee model</Eyebrow>
          <p className="font-display text-display-xs text-stamp-white mt-1">
            {initialHasOverride ? "Custom rates" : "Using platform default"}
          </p>
          <p className="text-xs text-stamp-muted-2 mt-1">
            Platform default: ₦{(defaultBaseKobo / 100).toLocaleString()} +{" "}
            {(defaultRateBps / 100).toLocaleString()}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state === "saved_set" && <Badge tone="success">Override applied</Badge>}
          {state === "saved_cleared" && <Badge tone="success">Cleared</Badge>}
          {dirty && state === "idle" && (
            <Badge tone="warning">Unsaved changes</Badge>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Base fee per ticket"
          type="number"
          inputMode="decimal"
          value={baseNaira}
          onChange={(e) => setBaseNaira(e.target.value)}
          prefix="₦"
        />
        <Input
          label="Variable rate"
          type="number"
          inputMode="decimal"
          value={ratePct}
          onChange={(e) => setRatePct(e.target.value)}
          suffix="%"
        />
      </div>

      {dirty && (
        <div className="p-4 rounded-md bg-stamp-surface2 border border-stamp-border">
          <Eyebrow>Preview at sample prices</Eyebrow>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            {samples.map((s) => (
              <div key={s.priceNaira} className="space-y-0.5">
                <p className="text-stamp-muted-2">
                  Org sets{" "}
                  <span className="text-stamp-white">
                    {formatNaira(s.priceKobo)}
                  </span>
                </p>
                <p className="text-stamp-orange tabular-nums">
                  Buyer: {formatNaira(s.buyerKobo)}
                </p>
                <p className="text-stamp-muted-2 tabular-nums">
                  Fee: {formatNaira(s.feeKobo)}
                </p>
              </div>
            ))}
          </div>
          {matchesDefault && (
            <p className="text-stamp-muted-2 text-xs mt-3 pt-3 border-t border-stamp-border">
              These values match the platform default. Saving as an override
              still pins {organizerName} to these rates explicitly —
              future changes to the platform default won't affect them.
            </p>
          )}
        </div>
      )}

      <Input
        label="Reason for change (optional)"
        placeholder="e.g. Partnership rate · friends-and-family · launch promo"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="Saved to the audit log alongside this change."
      />

      {error && (
        <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-stamp-border flex-wrap">
        <div>
          {initialHasOverride && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              loading={state === "submitting"}
              className="text-stamp-red hover:bg-stamp-red/10"
            >
              Clear override · use default
            </Button>
          )}
        </div>
        <Button
          onClick={handleApply}
          loading={state === "submitting"}
          disabled={!dirty}
          glow={dirty}
          size="lg"
        >
          {initialHasOverride ? "Update override" : "Apply override"}
        </Button>
      </div>
    </Card>
  );
}
