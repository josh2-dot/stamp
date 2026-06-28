-- Migration 011: complimentary tickets.
--
-- Lecturers, faculty advisors, media, sponsors — every campus event has
-- VIPs who get free entry. Organizers handle this manually via name lists
-- today. STAMP lets the organizer generate a comp QR from the dashboard
-- and SMS it directly.
--
-- Storage approach: comp tickets are ordinary `tickets` rows with
-- amount_paid=0, status='paid', is_complimentary=true. This keeps the
-- door scanner, ticket-page, ticket-lookup, and SMS delivery code all
-- working unchanged. Only the sales-count + revenue aggregations need to
-- exclude them.
--
-- comp_note is an organizer-supplied reason ("Dean of Student Affairs",
-- "Sponsor — TechCorp"). Optional. Surfaces in the admin ticket lookup
-- so support can tell paid from comped at a glance.

alter table tickets
  add column if not exists is_complimentary boolean default false,
  add column if not exists comp_note text;

-- Optional: index for quickly counting comps separately in dashboards.
create index if not exists tickets_comp_idx
  on tickets (event_id)
  where is_complimentary = true;
