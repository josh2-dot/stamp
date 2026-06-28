/**
 * STAMP platform fee — central, NOT organizer-configurable.
 *
 * The fee is silently added to the buyer's checkout total. Buyers see one
 * number (`tier.price + service_fee`) presented as the ticket price, with
 * no "Face value + Service fee" breakdown anywhere in the buyer flow.
 * Organizers receive exactly `tier.price` (what they entered in the form).
 *
 * Trade-offs of this model:
 * - Buyer never sees a "fee" line → zero surface for "what's this charge?"
 * - Organizer's take is bare and predictable
 * - But: the buyer-facing price isn't always round (₦3,000 entered →
 *   ₦3,290 displayed). The new event form's PayoutPreview shows organizers
 *   exactly what buyers will see, so there are no surprises.
 *
 * Marketed pricing: ₦200 + 3% per ticket sold.
 */

/** Flat per-ticket base fee, in kobo (₦200) */
export const FEE_BASE_KOBO = 20_000;

/** Variable fee rate in basis points (300 bps = 3%) */
export const FEE_RATE_BPS = 300;

/**
 * Compute STAMP's platform fee for a ticket at the given organizer price (kobo).
 * Returns the fee in kobo, rounded to the nearest kobo. This amount is added
 * on top of the organizer's price to produce the buyer's total.
 */
export function calculatePlatformFee(organizerPriceKobo: number): number {
  const variable = Math.round((organizerPriceKobo * FEE_RATE_BPS) / 10_000);
  return FEE_BASE_KOBO + variable;
}

/**
 * Convenience: what the buyer actually pays at checkout = organizer price
 * + STAMP fee. The single number shown across all buyer surfaces.
 */
export function calculateBuyerTotal(organizerPriceKobo: number): number {
  return organizerPriceKobo + calculatePlatformFee(organizerPriceKobo);
}
