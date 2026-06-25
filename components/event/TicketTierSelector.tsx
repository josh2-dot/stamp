"use client";

import { useRouter } from "next/navigation";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import type { TicketTier } from "@/types";
import { cn } from "@/lib/cn";

interface TicketTierSelectorProps {
  slug: string;
  tiers: TicketTier[];
}

export function TicketTierSelector({ slug, tiers }: TicketTierSelectorProps) {
  const router = useRouter();
  const { tierId, setTierId } = useCheckoutStore();

  const handleContinue = () => {
    if (!tierId) return;
    router.push(`/${slug}/checkout?tier=${tierId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <CardLabel>Select your ticket</CardLabel>
        <span className="text-xs text-stamp-muted">
          {tiers.filter((t) => t.sold < t.capacity).length} of {tiers.length} available
        </span>
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const soldOut = tier.sold >= tier.capacity;
          const selected = tierId === tier.id;
          const total = tier.price + tier.service_fee;
          const remaining = tier.capacity - tier.sold;
          const pctSold = Math.min(100, (tier.sold / tier.capacity) * 100);

          return (
            <button
              key={tier.id}
              type="button"
              disabled={soldOut}
              onClick={() => setTierId(tier.id)}
              className={cn(
                "w-full text-left rounded-lg border p-5 transition-all",
                "shadow-stamp-card focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-stamp-orange focus-visible:ring-offset-2",
                "focus-visible:ring-offset-stamp-black",
                soldOut
                  ? "bg-stamp-surface/40 border-stamp-border opacity-60 cursor-not-allowed"
                  : selected
                  ? "bg-stamp-surface2 border-stamp-orange shadow-stamp-glow"
                  : "bg-stamp-surface border-stamp-border hover:border-stamp-muted/40",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-display text-xl">{tier.name}</h3>
                    {soldOut && <Badge tone="danger">Sold out</Badge>}
                    {!soldOut && remaining <= 10 && (
                      <Badge tone="warning">{remaining} left</Badge>
                    )}
                  </div>
                  <p className="text-stamp-muted text-xs mt-1.5">
                    Face value {formatNaira(tier.price)} + {formatNaira(tier.service_fee)} service fee
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-display text-2xl text-stamp-white">
                    {formatNaira(total)}
                  </p>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-4 h-1 bg-stamp-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    soldOut ? "bg-stamp-red" : selected ? "bg-stamp-orange" : "bg-stamp-muted",
                  )}
                  style={{ width: `${pctSold}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <Button
          fullWidth
          size="lg"
          disabled={!tierId}
          onClick={handleContinue}
        >
          Continue to checkout
        </Button>
        <p className="text-xs text-stamp-muted text-center mt-3">
          You'll receive your ticket via WhatsApp instantly after payment.
        </p>
      </div>
    </div>
  );
}
