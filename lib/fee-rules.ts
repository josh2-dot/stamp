import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * STAMP platform fee — central, NOT organizer-configurable.
 *
 * The fee is silently added to the buyer's checkout total. Buyers see one
 * number (`tier.price + service_fee`) presented as the ticket price, with
 * no "Face value + Service fee" breakdown anywhere in the buyer flow.
 * Organizers receive exactly `tier.price` (what they entered in the form).
 *
 * Stored in the `platform_config` table so admins can change it without a
 * code deploy (see /admin/fees). The values below are compile-time fallbacks
 * — used if the DB read fails for any reason — and seeded as the initial
 * row values in migration 008.
 */

/** Compile-time fallback: flat per-ticket base fee, in kobo (₦200) */
export const FEE_BASE_KOBO_FALLBACK = 20_000;

/** Compile-time fallback: variable fee rate in basis points (300 = 3%) */
export const FEE_RATE_BPS_FALLBACK = 300;

interface FeeConfig {
  base: number;
  rate: number;
}

// Module-level cache. On a single Vercel function instance, the same fee
// config is reused across requests within the TTL. Admin fee changes
// propagate within ~60s without any explicit invalidation.
const CACHE_TTL_MS = 60_000;
let cached: { config: FeeConfig; expiresAt: number } | null = null;

/**
 * Read the current platform fee config from the DB, with caching.
 * Falls back to the compile-time constants if the DB read fails.
 */
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

/**
 * Force the next getPlatformFees() call to bypass cache. Call this from
 * the admin fee-update API after writing new values so the change is
 * visible immediately, not after the TTL expires.
 */
export function invalidateFeeCache(): void {
  cached = null;
}

/**
 * Compute STAMP's platform fee for a ticket at the given organizer price (kobo).
 * Async because the rates live in the DB. Use this in server-side code.
 *
 * For client-side fee previews (form UI), use /api/platform/config + a hook —
 * the client doesn't have direct DB access. See lib/use-platform-fees.ts.
 */
export async function calculatePlatformFee(
  organizerPriceKobo: number,
): Promise<number> {
  const { base, rate } = await getPlatformFees();
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}

/**
 * What the buyer actually pays at checkout = organizer price + STAMP fee.
 * Server-side. Same caveat as above re: client-side use.
 */
export async function calculateBuyerTotal(
  organizerPriceKobo: number,
): Promise<number> {
  return organizerPriceKobo + (await calculatePlatformFee(organizerPriceKobo));
}

/**
 * Pure calculation given explicit rates — used by the client-side hook
 * and by admin UI that already has the config loaded.
 */
export function calculatePlatformFeeFromRates(
  organizerPriceKobo: number,
  base: number,
  rate: number,
): number {
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}
