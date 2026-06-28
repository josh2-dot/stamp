import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  FEE_BASE_KOBO_FALLBACK,
  FEE_RATE_BPS_FALLBACK,
} from "@/lib/fee-math";

/**
 * STAMP platform fees — central and DB-driven.
 *
 * Two layers:
 *   1. platform_config (single row, migration 008) — the default rates
 *      applied to most organizers. Edited at /admin/fees.
 *   2. organizers.custom_fee_* (migration 009) — per-organizer overrides
 *      for early partners, big customers, internal accounts. Edited at
 *      /admin/organizers/[id]. NULL on both = no override.
 *
 * Override resolution: an organizer's effective rates are their override
 * if set, otherwise the platform default. The org-aware helpers below
 * do this resolution in one query (LEFT JOIN-like, but small enough to
 * just keep two queries here for readability).
 *
 * This file is server-only. Client components: import lib/fee-math.ts
 * for the pure helpers, fetch live values via /api/platform/config.
 */

export { FEE_BASE_KOBO_FALLBACK, FEE_RATE_BPS_FALLBACK };

interface FeeConfig {
  base: number;
  rate: number;
}

// ---- Global (default) config, 60s in-memory cache ----------------------

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

// ---- Per-organizer effective rates -----------------------------------

/**
 * Resolve the effective fees for a specific organizer.
 *  - If the organizer has custom_fee_base_kobo and custom_fee_rate_bps
 *    set, use those.
 *  - Otherwise, fall back to the platform default.
 *
 * `overridden` is true when the override is in play, so callers (e.g. the
 * admin UI) can render "Default" vs "Override" without a separate query.
 */
export async function getEffectiveFees(
  organizerId: string,
): Promise<FeeConfig & { overridden: boolean }> {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("organizers")
    .select("custom_fee_base_kobo, custom_fee_rate_bps")
    .eq("id", organizerId)
    .maybeSingle();

  if (
    !error &&
    data &&
    data.custom_fee_base_kobo !== null &&
    data.custom_fee_rate_bps !== null
  ) {
    return {
      base: Number(data.custom_fee_base_kobo),
      rate: Number(data.custom_fee_rate_bps),
      overridden: true,
    };
  }

  const defaults = await getPlatformFees();
  return { ...defaults, overridden: false };
}

// ---- Tier-side calculators ------------------------------------------

export async function calculatePlatformFee(
  organizerPriceKobo: number,
): Promise<number> {
  const { base, rate } = await getPlatformFees();
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}

/**
 * Same as calculatePlatformFee, but applies the organizer's override
 * if they have one. Tier create / edit routes should use this.
 */
export async function calculatePlatformFeeForOrganizer(
  organizerId: string,
  organizerPriceKobo: number,
): Promise<number> {
  const { base, rate } = await getEffectiveFees(organizerId);
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}

export async function calculateBuyerTotal(
  organizerPriceKobo: number,
): Promise<number> {
  return organizerPriceKobo + (await calculatePlatformFee(organizerPriceKobo));
}
