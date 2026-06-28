"use client";

import { useEffect, useState } from "react";
import {
  FEE_BASE_KOBO_FALLBACK,
  FEE_RATE_BPS_FALLBACK,
  calculatePlatformFeeFromRates,
} from "@/lib/fee-rules";

interface PlatformFees {
  base: number;
  rate: number;
}

/**
 * Client-side hook for reading platform fee config. Used by the organizer's
 * payout-preview UI in /dashboard/new and /dashboard/events/[id]/edit.
 *
 * Fetches once on mount. While the fetch is in flight, returns the
 * compile-time fallback values so the form preview always shows something
 * reasonable. If admins changed the fee meaningfully, the preview will
 * update once the fetch resolves (a few hundred ms typically).
 *
 * The hook also returns convenience calculators bound to the loaded rates,
 * so consumers don't have to thread the values manually.
 */
export function usePlatformFees(): {
  fees: PlatformFees;
  feeFor(priceKobo: number): number;
  buyerTotalFor(priceKobo: number): number;
  loaded: boolean;
} {
  const [fees, setFees] = useState<PlatformFees>({
    base: FEE_BASE_KOBO_FALLBACK,
    rate: FEE_RATE_BPS_FALLBACK,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/platform/config")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (
          typeof data?.fee_base_kobo === "number" &&
          typeof data?.fee_rate_bps === "number"
        ) {
          setFees({ base: data.fee_base_kobo, rate: data.fee_rate_bps });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    fees,
    feeFor: (priceKobo) =>
      calculatePlatformFeeFromRates(priceKobo, fees.base, fees.rate),
    buyerTotalFor: (priceKobo) =>
      priceKobo +
      calculatePlatformFeeFromRates(priceKobo, fees.base, fees.rate),
    loaded,
  };
}
