import { getPlatformFees } from "@/lib/fee-rules";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeeEditor } from "./FeeEditor";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminFeesPage() {
  const fees = await getPlatformFees();

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Eyebrow>Fee model</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          Platform pricing.
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3 max-w-xl">
          Changes take effect within ~60s for new ticket sales. Existing tickets
          and in-flight checkouts use the rate at the time they started.
          Every change is logged to the audit trail.
        </p>
      </div>

      <FeeEditor
        initialBaseKobo={fees.base}
        initialRateBps={fees.rate}
      />

      <Card>
        <Eyebrow>How this is applied</Eyebrow>
        <ul className="space-y-2 text-sm text-stamp-muted-2 mt-3">
          <li>
            <span className="text-stamp-white">Organizers</span> see "STAMP's
            ₦X + Y%" in the payout-preview when creating or editing tiers.
          </li>
          <li>
            <span className="text-stamp-white">Buyers</span> see one number
            (price + fee) — no breakdown at checkout.
          </li>
          <li>
            <span className="text-stamp-white">Existing tiers</span> keep their
            stored service_fee until the organizer re-saves the tier. New
            sales use whatever the tier row currently says.
          </li>
        </ul>
      </Card>

      <Card>
        <Eyebrow>Worked examples (with current rates)</Eyebrow>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          {[500, 1000, 2000, 3000, 5000, 10000].map((priceNaira) => {
            const priceKobo = priceNaira * 100;
            const feeKobo = fees.base + Math.round((priceKobo * fees.rate) / 10000);
            const buyerKobo = priceKobo + feeKobo;
            const effRate = (feeKobo / priceKobo) * 100;
            return (
              <div
                key={priceNaira}
                className="p-3 rounded-md bg-stamp-surface2 border border-stamp-border"
              >
                <p className="text-stamp-muted-2 text-xs">Organizer sets</p>
                <p className="font-medium text-stamp-white tabular-nums">
                  {formatNaira(priceKobo)}
                </p>
                <div className="pt-2 mt-2 border-t border-stamp-border space-y-0.5 text-xs">
                  <p className="text-stamp-muted-2">
                    Fee: <span className="tabular-nums">{formatNaira(feeKobo)}</span>
                  </p>
                  <p className="text-stamp-orange">
                    Buyer sees: <span className="tabular-nums">{formatNaira(buyerKobo)}</span>
                  </p>
                  <p className={effRate > 15 ? "text-stamp-gold" : "text-stamp-muted-2"}>
                    Effective: {effRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
