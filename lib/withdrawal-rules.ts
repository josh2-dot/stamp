/**
 * Minimum withdrawal: ₦1,000 (100,000 kobo).
 * Below this, the Paystack transfer fee eats too much of the payout.
 */
export const MIN_WITHDRAWAL_KOBO = 100_000;

/**
 * Withdrawals are settled in whole-naira amounts so the UI is clean.
 * Internally everything is still kobo.
 */
export const WITHDRAWAL_AMOUNT_MULTIPLE_KOBO = 100;
