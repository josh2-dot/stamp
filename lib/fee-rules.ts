import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  FEE_BASE_KOBO_FALLBACK,
  FEE_RATE_BPS_FALLBACK,
} from "@/lib/fee-math";

/**
 * STAMP platform fee — central, NOT organizer-configurable.
 *
 * Fee values are stored in the `platform_config` table so admins can change
 * them without a code deploy (see /admin/fees). This module reads them
 * with a short TTL cache, fronted by compile-time fallbacks from
 * lib/fee-math.ts in case the DB read ever fails.
 *
 * This file is server-only. Client components that need to do fee math
 * should import lib/fee-math.ts directly (pure constants + helpers) and
 * fetch live values via /api/platform/config — see lib/use-platform-fees.ts.
 */

// Re-export the fallback constants so server callers don't have to know
// the math module exists. Keeps the "fee-rules" surface coherent.
export { FEE_BASE_KOBO_FALLBACK, FEE_RATE_BPS_FALLBACK };

interface FeeConfig {
  base: number;
  rate: number;
}

// Module-level cache. On a single Vercel function instance the same fee
// config is reused across requests within the TTL. Admin fee changes
// propagate within ~60s without explicit invalidation, or immediately
// when /api/admin/fees calls invalidateFeeCache() on save.
const CACHE_TTL_MS = 60_000;
let cached: { config: FeeConfig; expiresAt: number } | null = null;

export async function getPlatformFees(): Promise<FeeConfig> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.config;
  }

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("platform_config")
      .select("fee_base_kobo, fee_rate_bps")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("[fee-rules] DB read failed, using fallback", error);
      return { base: FEE_BASE_KOBO_FALLBACK, rate: FEE_RATE_BPS_FALLBACK };
    }

    const config: FeeConfig = {
      base: Number(data.fee_base_kobo),
      rate: Number(data.fee_rate_bps),
    };
    cached = { config, expiresAt: now + CACHE_TTL_MS };
    return config;
  } catch (err) {
    console.error("[fee-rules] unexpected error reading config", err);
    return { base: FEE_BASE_KOBO_FALLBACK, rate: FEE_RATE_BPS_FALLBACK };
  }
}

export function invalidateFeeCache(): void {
  cached = null;
}

export async function calculatePlatformFee(
  organizerPriceKobo: number,
): Promise<number> {
  const { base, rate } = await getPlatformFees();
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}

export async function calculateBuyerTotal(
  organizerPriceKobo: number,
): Promise<number> {
  return organizerPriceKobo + (await calculatePlatformFee(organizerPriceKobo));
}
