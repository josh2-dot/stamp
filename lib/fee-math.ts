/**
 * Pure fee calculations — no imports, no side effects, client-safe.
 *
 * The DB-driven fee config lives in lib/fee-rules.ts (server only).
 * This file is the boundary-safe surface for components that need to do
 * fee math with rates they already have on hand (form previews, admin
 * editor, anywhere a client component needs to render fee numbers).
 *
 * Constants here are the FALLBACK values used if the DB read in
 * lib/fee-rules.ts fails — they're not the source of truth at runtime.
 */

/** Compile-time fallback: flat per-ticket base fee, in kobo (₦200) */
export const FEE_BASE_KOBO_FALLBACK = 20_000;

/** Compile-time fallback: variable fee rate in basis points (300 = 3%) */
export const FEE_RATE_BPS_FALLBACK = 300;

/**
 * Pure calculation given explicit rates. Used by client hooks and any
 * server code that already has the config loaded.
 */
export function calculatePlatformFeeFromRates(
  organizerPriceKobo: number,
  base: number,
  rate: number,
): number {
  const variable = Math.round((organizerPriceKobo * rate) / 10_000);
  return base + variable;
}
