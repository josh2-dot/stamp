-- Migration 002: relax organizer.phone uniqueness, harden auth_user_id link.
-- Run this AFTER schema.sql if you've already created the organizers table.

alter table organizers drop constraint if exists organizers_phone_key;
create unique index if not exists organizers_auth_user_id_uniq
  on organizers(auth_user_id)
  where auth_user_id is not null;

-- Optional: still index phone for lookups
create index if not exists organizers_phone_idx on organizers(phone);
