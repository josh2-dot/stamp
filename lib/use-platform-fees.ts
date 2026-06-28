"use client";

import { useEffect, useState } from "react";
import {
  FEE_BASE_KOBO_FALLBACK,
  FEE_RATE_BPS_FALLBACK,
  calculatePlatformFeeFromRates,
} from "@/lib/fee-math";

interface PlatformFees {
  base: number;
  rate: number;
  /** True when these rates are a per-organizer override, not the default */
  overridden: boolean;
}

/**
 * Client-side hook for reading the caller's effective fee config.
 *
 * For signed-in organizers, the values reflect their per-organizer override
 * if one exists, otherwise the platform default. The `overridden` flag lets
 * the UI distinguish "Your custom rate" from "Standard fee".
 *
 * Fetches once on mount. While the fetch is in flight, returns the
 * compile-time fallback values.
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
    overridden: false,
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
          setFees({
            base: data.fee_base_kobo,
            rate: data.fee_rate_bps,
            overridden: Boolean(data.overridden),
          });
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
