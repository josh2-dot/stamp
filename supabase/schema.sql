-- ============================================================
-- STAMP — Schema
-- Run in Supabase SQL editor in order.
-- ============================================================

-- 1. TABLES
-- ------------------------------------------------------------

create table if not exists organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  bank_name text,
  bank_code text,
  account_number text,
  account_name text,
  paystack_recipient_code text,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists organizers_auth_user_id_uniq
  on organizers(auth_user_id)
  where auth_user_id is not null;
create index if not exists organizers_phone_idx on organizers(phone);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references organizers(id) on delete cascade,
  title text not null,
  description text,
  venue text not null,
  event_date timestamptz not null,
  poster_url text,
  slug text unique not null,
  scanner_secret text not null default gen_random_uuid()::text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists events_slug_idx on events(slug);
create index if not exists events_organizer_idx on events(organizer_id);
create index if not exists events_scanner_secret_idx on events(scanner_secret);

create table if not exists ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  service_fee integer not null check (service_fee >= 0),
  capacity integer not null check (capacity > 0),
  sold integer default 0 check (sold >= 0),
  sort_order integer default 0
);

create index if not exists ticket_tiers_event_idx on ticket_tiers(event_id);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  tier_id uuid references ticket_tiers(id) on delete restrict,
  buyer_name text,
  buyer_phone text not null,
  qr_code text unique not null,
  qr_image_url text,
  paystack_ref text unique,
  amount_paid integer not null check (amount_paid >= 0),
  status text default 'pending' check (status in ('pending', 'paid', 'failed')),
  used boolean default false,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists tickets_event_idx on tickets(event_id);
create index if not exists tickets_qr_idx on tickets(qr_code);
create index if not exists tickets_paystack_idx on tickets(paystack_ref);
create index if not exists tickets_status_idx on tickets(status);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  paystack_ref text unique not null,
  amount integer not null,
  status text default 'pending' check (status in ('pending', 'success', 'failed')),
  raw_payload jsonb,
  created_at timestamptz default now()
);

create index if not exists transactions_ref_idx on transactions(paystack_ref);

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

-- 2. ATOMIC SOLD INCREMENT
-- ------------------------------------------------------------
-- Called from the webhook handler to avoid race conditions
-- when many concurrent purchases hit the same tier.

create or replace function increment_tier_sold(p_tier_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_capacity int;
  v_sold int;
begin
  select capacity, sold
    into v_capacity, v_sold
    from ticket_tiers
    where id = p_tier_id
    for update;

  if v_sold + 1 > v_capacity then
    raise exception 'Tier sold out';
  end if;

  update ticket_tiers
    set sold = sold + 1
    where id = p_tier_id;
end;
$$;

-- Available payout balance for an organizer, in kobo.
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

-- 3. REALTIME
-- ------------------------------------------------------------
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table withdrawals;

-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table organizers   enable row level security;
alter table events       enable row level security;
alter table ticket_tiers enable row level security;
alter table tickets      enable row level security;
alter table transactions enable row level security;
alter table withdrawals  enable row level security;

-- Public read for live event pages
drop policy if exists "events public read" on events;
create policy "events public read"
  on events for select
  using (is_active = true);

drop policy if exists "ticket_tiers public read" on ticket_tiers;
create policy "ticket_tiers public read"
  on ticket_tiers for select
  using (
    exists (
      select 1 from events
      where events.id = ticket_tiers.event_id
        and events.is_active = true
    )
  );

-- Organizer self-read
drop policy if exists "organizers self read" on organizers;
create policy "organizers self read"
  on organizers for select
  using (auth.uid() = auth_user_id);

drop policy if exists "events organizer read" on events;
create policy "events organizer read"
  on events for select
  using (
    exists (
      select 1 from organizers
      where organizers.id = events.organizer_id
        and organizers.auth_user_id = auth.uid()
    )
  );

drop policy if exists "tickets organizer read" on tickets;
create policy "tickets organizer read"
  on tickets for select
  using (
    exists (
      select 1 from events
      join organizers on organizers.id = events.organizer_id
      where events.id = tickets.event_id
        and organizers.auth_user_id = auth.uid()
    )
  );

drop policy if exists "transactions organizer read" on transactions;
create policy "transactions organizer read"
  on transactions for select
  using (
    exists (
      select 1 from tickets
      join events on events.id = tickets.event_id
      join organizers on organizers.id = events.organizer_id
      where tickets.id = transactions.ticket_id
        and organizers.auth_user_id = auth.uid()
    )
  );

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

-- All writes go through service-role-keyed server routes; no public policies.

-- 5. STORAGE BUCKET
-- ------------------------------------------------------------
-- Run once in the Supabase Storage UI or via SQL:
insert into storage.buckets (id, name, public)
  values ('qr-codes', 'qr-codes', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('posters', 'posters', true)
  on conflict (id) do nothing;
