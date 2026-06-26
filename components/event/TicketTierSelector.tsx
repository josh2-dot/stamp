"use client";

import { useRouter } from "next/navigation";
import { SelectableCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
        <Eyebrow>Select your ticket</Eyebrow>
        <span className="text-xs text-stamp-muted-2">
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
            <SelectableCard
              key={tier.id}
              selected={selected}
              soldOut={soldOut}
              onClick={() => setTierId(tier.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-display-xs text-stamp-white">
                      {tier.name}
                    </h3>
                    {soldOut && <Badge tone="danger">Sold out</Badge>}
                    {!soldOut && remaining <= 10 && (
                      <Badge tone="warning">{remaining} left</Badge>
                    )}
                  </div>
                  <p className="text-stamp-muted-2 text-xs mt-1.5">
                    Face value {formatNaira(tier.price)} + {formatNaira(tier.service_fee)} service fee
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-display-sm text-stamp-white">
                    {formatNaira(total)}
                  </p>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-4 h-1 bg-stamp-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    soldOut
                      ? "bg-stamp-red"
                      : selected
                        ? "bg-stamp-orange"
                        : "bg-stamp-muted",
                  )}
                  style={{ width: `${pctSold}%` }}
                />
              </div>
            </SelectableCard>
          );
        })}
      </div>

      <div className="pt-2">
        {/* glow here — the one primary action on the event page */}
        <Button
          fullWidth
          size="lg"
          glow
          disabled={!tierId}
          onClick={handleContinue}
        >
          Continue to checkout
        </Button>
        <p className="text-xs text-stamp-muted-2 text-center mt-3">
          You'll receive your ticket via WhatsApp instantly after payment.
        </p>
      </div>
    </div>
  );
}
