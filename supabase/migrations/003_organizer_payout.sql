-- Migration 003: payout-related columns on organizers.
-- Apply after schema.sql + migration 002.

alter table organizers
  add column if not exists bank_code text;

alter table organizers
  add column if not exists paystack_recipient_code text;

-- Helpful for fast lookups when triggering payouts
create index if not exists organizers_recipient_idx on organizers(paystack_recipient_code)
  where paystack_recipient_code is not null;
