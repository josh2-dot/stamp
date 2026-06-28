-- Migration 013: integrate awards revenue + module fees into organizer balance.
--
-- Three things happening here:
--
-- 1. Fix a latent bug in organizer_balance_summary — it summed tt.price
--    for ALL paid tickets, including complimentary ones. Comps have
--    amount_paid=0 (no money came in) but the existing function counted
--    them as earnings. Fixed by filtering out is_complimentary.
--
-- 2. Add award vote earnings to the balance. Votes flow 100% to organizer
--    (no per-vote STAMP cut), so the earned column adds sum(amount_paid)
--    on paid award_votes.
--
-- 3. Subtract any awards module fees that have been charged. The fee is
--    materialized into events.awards_module_fee_charged_kobo by the
--    charge_awards_module_fees() helper below — called from the
--    withdrawal API right before the balance check.

create or replace function organizer_balance_summary(p_organizer_id uuid)
returns table (
  earned bigint,
  available bigint,
  in_flight bigint,
  paid_out bigint
)
language plpgsql
security definer
as $$
begin
  return query
  with ticket_earnings as (
    select coalesce(sum(tt.price), 0)::bigint as amt
      from tickets t
      join ticket_tiers tt on tt.id = t.tier_id
      join events ev       on ev.id = t.event_id
     where ev.organizer_id = p_organizer_id
       and t.status = 'paid'
       and coalesce(t.is_complimentary, false) = false
  ),
  vote_earnings as (
    select coalesce(sum(av.amount_paid), 0)::bigint as amt
      from award_votes av
      join events ev on ev.id = av.event_id
     where ev.organizer_id = p_organizer_id
       and av.status = 'paid'
  ),
  awards_fees_charged as (
    select coalesce(sum(ev.awards_module_fee_charged_kobo), 0)::bigint as amt
      from events ev
     where ev.organizer_id = p_organizer_id
       and ev.awards_module_fee_charged_kobo is not null
  ),
  w as (
    select
      coalesce(sum(amount) filter (where status in ('pending', 'otp_required', 'processing')), 0)::bigint as in_flight,
      coalesce(sum(amount) filter (where status = 'success'), 0)::bigint as paid_out
      from withdrawals
     where organizer_id = p_organizer_id
  )
  select
    (ticket_earnings.amt + vote_earnings.amt - awards_fees_charged.amt)::bigint as earned,
    (ticket_earnings.amt + vote_earnings.amt - awards_fees_charged.amt
       - coalesce(w.in_flight, 0) - coalesce(w.paid_out, 0))::bigint as available,
    coalesce(w.in_flight, 0),
    coalesce(w.paid_out, 0)
    from ticket_earnings, vote_earnings, awards_fees_charged
    left join w on true;
end;
$$;

-- ---- charge_awards_module_fees -----------------------------------------
-- Walks the organizer's events. For each event with award vote revenue
-- and no charged fee yet, materialize the fee:
--   charged = min(effective_module_fee, total_vote_revenue_for_event)
-- This caps the fee at actual vote revenue (so an event with ₦300 in
-- votes is charged ₦300, not the ₦5,000 default). Idempotent — once
-- charged_at is set, the event is skipped on subsequent calls.
--
-- Call this from the withdrawal API right before reading the balance.
create or replace function charge_awards_module_fees(p_organizer_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_event record;
  v_fee bigint;
  v_revenue bigint;
  v_charge bigint;
begin
  v_fee := effective_awards_module_fee(p_organizer_id);

  for v_event in
    select ev.id
      from events ev
     where ev.organizer_id = p_organizer_id
       and ev.awards_enabled = true
       and ev.awards_module_fee_charged_at is null
  loop
    -- Sum paid vote revenue for this event
    select coalesce(sum(av.amount_paid), 0)::bigint
      into v_revenue
      from award_votes av
     where av.event_id = v_event.id
       and av.status = 'paid';

    -- Skip events with no revenue yet — wait until votes actually land
    if v_revenue <= 0 then
      continue;
    end if;

    v_charge := least(v_fee, v_revenue);

    update events
       set awards_module_fee_charged_kobo = v_charge,
           awards_module_fee_charged_at = now()
     where id = v_event.id;
  end loop;
end;
$$;

-- ---- organizer_available_balance ---------------------------------------
-- The withdrawal API uses this lighter-weight variant. Same model as the
-- summary function but returns one number.
create or replace function organizer_available_balance(p_organizer_id uuid)
returns bigint
language plpgsql
security definer
as $$
declare
  v_ticket_earnings bigint;
  v_vote_earnings   bigint;
  v_awards_fees     bigint;
  v_pendingo        bigint;
begin
  select coalesce(sum(tt.price), 0)::bigint
    into v_ticket_earnings
    from tickets t
    join ticket_tiers tt on tt.id = t.tier_id
    join events e        on e.id = t.event_id
   where e.organizer_id = p_organizer_id
     and t.status = 'paid'
     and coalesce(t.is_complimentary, false) = false;

  select coalesce(sum(av.amount_paid), 0)::bigint
    into v_vote_earnings
    from award_votes av
    join events e on e.id = av.event_id
   where e.organizer_id = p_organizer_id
     and av.status = 'paid';

  select coalesce(sum(e.awards_module_fee_charged_kobo), 0)::bigint
    into v_awards_fees
    from events e
   where e.organizer_id = p_organizer_id
     and e.awards_module_fee_charged_kobo is not null;

  select coalesce(sum(amount), 0)::bigint
    into v_pendingo
    from withdrawals
   where organizer_id = p_organizer_id
     and status in ('pending', 'otp_required', 'processing', 'success');

  return v_ticket_earnings + v_vote_earnings - v_awards_fees - v_pendingo;
end;
$$;
