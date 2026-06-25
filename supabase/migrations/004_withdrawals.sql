-- Migration 004: payouts ledger + balance RPC.
-- Apply after schema.sql + migrations 002 + 003.

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references organizers(id) on delete restrict,
  amount integer not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'otp_required', 'processing', 'success', 'failed', 'reversed')),
  paystack_transfer_code text unique,
  paystack_reference text unique not null,
  failure_reason text,
  requested_at timestamptz default now(),
  completed_at timestamptz,
  raw_payload jsonb
);

create index if not exists withdrawals_org_idx on withdrawals(organizer_id);
create index if not exists withdrawals_status_idx on withdrawals(status);
create index if not exists withdrawals_transfer_code_idx on withdrawals(paystack_transfer_code);

-- RLS — organizers see only their own withdrawals
alter table withdrawals enable row level security;

drop policy if exists "withdrawals organizer read" on withdrawals;
create policy "withdrawals organizer read"
  on withdrawals for select
  using (
    exists (
      select 1 from organizers
      where organizers.id = withdrawals.organizer_id
        and organizers.auth_user_id = auth.uid()
    )
  );

-- Realtime so the payouts page can react to webhook updates
alter publication supabase_realtime add table withdrawals;

-- ============================================================
-- Available balance = sum(tier.price) over paid tickets
--                     - sum(withdrawals where not failed/reversed)
-- Returned in kobo.
-- ============================================================
create or replace function organizer_available_balance(p_organizer_id uuid)
returns bigint
language plpgsql
security definer
as $$
declare
  v_earned   bigint;
  v_pendingo bigint;
begin
  select coalesce(sum(tt.price), 0)::bigint
    into v_earned
    from tickets t
    join ticket_tiers tt on tt.id = t.tier_id
    join events e        on e.id = t.event_id
   where e.organizer_id = p_organizer_id
     and t.status = 'paid';

  select coalesce(sum(amount), 0)::bigint
    into v_pendingo
    from withdrawals
   where organizer_id = p_organizer_id
     and status in ('pending', 'otp_required', 'processing', 'success');

  return v_earned - v_pendingo;
end;
$$;

-- A lighter info view: lifetime earned / outstanding / paid out
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
  with e as (
    select coalesce(sum(tt.price), 0)::bigint as earned
      from tickets t
      join ticket_tiers tt on tt.id = t.tier_id
      join events ev       on ev.id = t.event_id
     where ev.organizer_id = p_organizer_id
       and t.status = 'paid'
  ),
  w as (
    select
      coalesce(sum(amount) filter (where status in ('pending', 'otp_required', 'processing')), 0)::bigint as in_flight,
      coalesce(sum(amount) filter (where status = 'success'), 0)::bigint as paid_out
      from withdrawals
     where organizer_id = p_organizer_id
  )
  select
    e.earned,
    (e.earned - coalesce(w.in_flight, 0) - coalesce(w.paid_out, 0))::bigint as available,
    coalesce(w.in_flight, 0),
    coalesce(w.paid_out, 0)
  from e, w;
end;
$$;
