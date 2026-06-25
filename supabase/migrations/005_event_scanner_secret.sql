-- Migration 005: per-event scanner secret.
-- Lets door staff use the scanner without an organizer login,
-- while preventing random visitors from harvesting ticket QR codes
-- via the offline-cache endpoint.

alter table events
  add column if not exists scanner_secret text not null default gen_random_uuid()::text;

create index if not exists events_scanner_secret_idx
  on events(scanner_secret);
