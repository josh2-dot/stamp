-- Migration 008: admin dashboard infrastructure.
--
-- 1. platform_config: single-row settings table. Fee model values live here
--    so admins can change them without a code deploy. The lib/fee-rules.ts
--    module reads this with a short TTL cache.
--
-- 2. admin_audit_log: every write action from /admin/* logs an entry.
--    Records who, what, when, and a before/after snapshot. Read-only via UI.
--
-- 3. platform_stats(): RPC for the admin landing page. Aggregates GMV,
--    STAMP revenue, settled-to-organizers, and counts in one round trip.

-- ----------------------------------------------------------------------
-- platform_config: single-row settings.
-- ----------------------------------------------------------------------
create table if not exists platform_config (
  id integer primary key default 1 check (id = 1),  -- only ever one row
  fee_base_kobo bigint not null default 20000,      -- ₦200
  fee_rate_bps integer not null default 300,         -- 3% (300 basis points)
  updated_at timestamptz default now(),
  updated_by text                                    -- admin email
);

-- Seed the single config row if it doesn't exist
insert into platform_config (id, fee_base_kobo, fee_rate_bps)
values (1, 20000, 300)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------
-- admin_audit_log: every admin write action.
-- ----------------------------------------------------------------------
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,             -- short slug, e.g. 'fee_config_update'
  target_type text,                  -- 'platform_config', 'organizer', etc.
  target_id text,                    -- the row id touched, if applicable
  before jsonb,
  after jsonb,
  note text,                         -- optional human-written context
  created_at timestamptz default now()
);

create index if not exists admin_audit_log_created_at_idx
  on admin_audit_log(created_at desc);
create index if not exists admin_audit_log_action_idx
  on admin_audit_log(action);

-- ----------------------------------------------------------------------
-- platform_stats(): aggregate dashboard metrics in one call.
-- ----------------------------------------------------------------------
create or replace function platform_stats()
returns table (
  organizers_count bigint,
  events_count bigint,
  events_active_count bigint,
  tickets_paid_count bigint,
  gmv_kobo bigint,                  -- gross — what buyers paid in total
  stamp_revenue_kobo bigint,        -- sum of service_fee on paid tickets
  organizer_earnings_kobo bigint    -- sum of price on paid tickets (settled or pending)
)
language plpgsql
security definer
as $$
begin
  return query
  with o as (
    select count(*)::bigint as organizers_count from organizers
  ),
  e as (
    select
      count(*)::bigint as events_count,
      count(*) filter (where is_active)::bigint as events_active_count
    from events
  ),
  t as (
    select
      count(*)::bigint as tickets_paid_count,
      coalesce(sum(tt.price + tt.service_fee), 0)::bigint as gmv_kobo,
      coalesce(sum(tt.service_fee), 0)::bigint as stamp_revenue_kobo,
      coalesce(sum(tt.price), 0)::bigint as organizer_earnings_kobo
    from tickets ti
    join ticket_tiers tt on tt.id = ti.tier_id
    where ti.status = 'paid'
  )
  select
    o.organizers_count,
    e.events_count, e.events_active_count,
    t.tickets_paid_count, t.gmv_kobo, t.stamp_revenue_kobo, t.organizer_earnings_kobo
  from o cross join e cross join t;
end;
$$;
