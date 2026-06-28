-- Migration 009: per-organizer fee overrides.
--
-- Most organizers use the platform default fees from platform_config.
-- A few (early partners, large customers, internal accounts) get custom
-- rates set by an admin. NULL on both columns = no override.
--
-- The CHECK constraint guards against partial overrides — you can't
-- have "custom base but default rate" or vice versa, which would be
-- ambiguous in the lookup code.
--
-- Overrides apply only at tier-save time. Existing tier rows keep their
-- stored service_fee until re-saved. This matches how global fee changes
-- behave — commitments to organizers and buyers don't shift under them.

alter table organizers
  add column if not exists custom_fee_base_kobo bigint,
  add column if not exists custom_fee_rate_bps integer;

-- Use a do block so the constraint isn't re-added on re-run
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizers_custom_fee_both_or_neither'
  ) then
    alter table organizers
      add constraint organizers_custom_fee_both_or_neither
      check (
        (custom_fee_base_kobo is null) = (custom_fee_rate_bps is null)
      );
  end if;
end $$;

create index if not exists organizers_has_custom_fee_idx
  on organizers (id)
  where custom_fee_base_kobo is not null;
