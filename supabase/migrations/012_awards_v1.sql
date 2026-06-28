-- Migration 012: Awards V1.
--
-- Three-phase awards module bolted onto events. Each event can have any
-- number of award categories ("Best Dressed Female", "MC of the Year"),
-- each running its own nomination → moderation → voting → reveal cycle.
--
-- Identity model: phone-number-only. No phone verification on nominees.
-- Public nominations get manually moderated by the organizer; the
-- organizer promotes raw nominations into a locked ballot before voting
-- opens. Voters pay per vote via Paystack, money flows 100% to the
-- organizer. STAMP collects a flat per-event "awards module" fee at
-- payout time, capped at the actual vote revenue.
--
-- Phase transitions are gated by an explicit organizer action — no auto
-- advancement. The phase column on award_categories is the source of
-- truth for what UI to show on the public event page.

-- ---- platform_config: awards module fee ---------------------------------
alter table platform_config
  add column if not exists awards_module_fee_kobo bigint not null default 500000;
-- ₦5,000 default; admin editable at /admin/fees

-- Optional per-organizer override (mirrors the ticket-fee override shape)
alter table organizers
  add column if not exists custom_awards_module_fee_kobo bigint;
-- nullable. NULL = use platform default.

-- ---- award_categories ---------------------------------------------------
create table if not exists award_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,                       -- "Best Dressed (Male)"
  vote_price_kobo bigint not null default 10000,  -- ₦100 default
  -- Phase: draft → nominations_open → moderation → voting_open → voting_closed → revealed
  -- 'draft' means created but nominations not yet open. Organizer can
  -- edit label/price freely until they open nominations.
  phase text not null default 'draft',
  nominations_open_at timestamptz,
  nominations_close_at timestamptz,
  voting_open_at timestamptz,
  voting_close_at timestamptz,
  -- Whether the public can see live vote counts during voting, or only
  -- after reveal. Organizers often want suspense.
  results_public_during_voting boolean not null default false,
  -- Optional cap per voter per category. Null = unlimited (whale voting OK).
  max_votes_per_voter integer,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  -- Cached winner after reveal (denormalized for the winner notification
  -- flow + reveal screen — avoids re-counting on every page load)
  revealed_winner_id uuid,
  revealed_at timestamptz,
  check (phase in (
    'draft', 'nominations_open', 'moderation', 'voting_open',
    'voting_closed', 'revealed'
  ))
);

create index if not exists award_categories_event_idx
  on award_categories (event_id, sort_order);

-- ---- award_nominees: the locked ballot ---------------------------------
-- One row per nominee on the final ballot, created when the organizer
-- promotes a raw nomination during moderation. is_excluded lets the
-- organizer remove a promoted nominee without losing the audit trail.
create table if not exists award_nominees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references award_categories(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  display_name text not null,
  description text,
  photo_url text,
  is_excluded boolean not null default false,
  sort_order integer not null default 0,
  -- Cached vote totals (incremented on paid vote) — saves a count(*)
  -- on every leaderboard fetch during a busy voting window.
  votes_count integer not null default 0,
  amount_kobo bigint not null default 0,
  created_at timestamptz default now()
);

create index if not exists award_nominees_category_idx
  on award_nominees (category_id, is_excluded, sort_order);

-- ---- award_nominations: raw public submissions -------------------------
-- Stored as-typed by the nominator. The organizer reviews these during
-- moderation and either promotes (creates an award_nominees row) or
-- rejects. Multiple nominations for the same person can be promoted into
-- a single nominee row (manual merge).
create table if not exists award_nominations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references award_categories(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  nominee_name text not null,        -- as typed
  nominator_phone text not null,     -- not verified, just captured
  -- Set when the organizer promotes this raw nomination into a ballot
  -- entry. Multiple nominations can resolve to the same nominee.
  resolved_to uuid references award_nominees(id) on delete set null,
  status text not null default 'pending',
  -- pending → promoted | rejected
  created_at timestamptz default now(),
  check (status in ('pending', 'promoted', 'rejected'))
);

create index if not exists award_nominations_category_idx
  on award_nominations (category_id, status);

-- Prevent the same nominator from submitting the same name twice in a
-- category (cheap spam filter without phone verification).
create unique index if not exists award_nominations_dedupe_uniq
  on award_nominations (
    category_id,
    nominator_phone,
    lower(trim(nominee_name))
  );

-- ---- award_votes -------------------------------------------------------
-- Paid via Paystack. Money flows 100% to organizer; STAMP's cut is the
-- flat per-event module fee deducted at payout, not per-vote.
create table if not exists award_votes (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid not null references award_nominees(id) on delete cascade,
  category_id uuid not null references award_categories(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  voter_phone text not null,
  voter_name text,                   -- optional
  voter_email text,                  -- optional, for Paystack receipt
  quantity integer not null,
  paystack_ref text not null unique,
  amount_paid bigint not null,       -- kobo, = quantity * vote_price at purchase
  status text not null default 'pending',  -- pending → paid (webhook flip)
  created_at timestamptz default now(),
  paid_at timestamptz,
  check (status in ('pending', 'paid'))
);

create index if not exists award_votes_nominee_idx
  on award_votes (nominee_id, status);
create index if not exists award_votes_category_voter_idx
  on award_votes (category_id, voter_phone) where status = 'paid';

-- ---- events: awards module bookkeeping ----------------------------------
alter table events
  add column if not exists awards_enabled boolean not null default false,
  add column if not exists awards_module_fee_charged_kobo bigint,
  add column if not exists awards_module_fee_charged_at timestamptz;
-- awards_enabled flips true when the organizer creates their first
-- category. Used by /[slug] to know whether to render the voting section.
-- The fee_charged_* fields are set at payout time so we know it's been
-- collected (or partially capped at vote revenue).

-- ---- effective_awards_module_fee(): override resolution -----------------
create or replace function effective_awards_module_fee(p_organizer_id uuid)
returns bigint
language plpgsql
security definer
as $$
declare
  v_custom bigint;
  v_default bigint;
begin
  select custom_awards_module_fee_kobo into v_custom
    from organizers where id = p_organizer_id;
  if v_custom is not null then
    return v_custom;
  end if;

  select awards_module_fee_kobo into v_default
    from platform_config where id = 1;
  return coalesce(v_default, 500000);
end;
$$;

-- ---- recount_nominee_votes: convenience for the webhook -----------------
-- Called when a vote payment confirms. Avoids race conditions with the
-- denormalized counters by recomputing in a single SQL pass under FOR UPDATE.
create or replace function recount_nominee_votes(p_nominee_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update award_nominees an set
    votes_count = coalesce((
      select sum(quantity) from award_votes
       where nominee_id = an.id and status = 'paid'
    ), 0),
    amount_kobo = coalesce((
      select sum(amount_paid) from award_votes
       where nominee_id = an.id and status = 'paid'
    ), 0)
  where an.id = p_nominee_id;
end;
$$;
