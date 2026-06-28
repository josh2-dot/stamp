-- Migration 010: store the buyer's real email on the ticket.
--
-- Checkout currently uses a synthetic email (phone@buyers.stamptickets.ng)
-- when the buyer doesn't supply one — Paystack requires an email field.
-- That synthetic value is not a real address and must never be used for
-- transactional sends.
--
-- This column holds the buyer's REAL email (or NULL if they didn't give
-- one). The webhook checks this column to decide whether to fire an
-- email-channel delivery.
alter table tickets
  add column if not exists buyer_email text;

-- No backfill — all historical tickets have NULL, which the webhook
-- treats as "no email channel for this buyer". They got SMS / WhatsApp.
