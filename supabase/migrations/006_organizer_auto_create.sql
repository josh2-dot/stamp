-- Migration 006: auto-create organizer row on auth.users insert.
--
-- Before this, signing up via magic link created the auth user but no
-- organizer row, leaving new users stuck on "Account setup in progress"
-- forever. This trigger closes the gap.
--
-- The organizer row is created with:
--   - name = email local-part (user edits in Settings)
--   - phone = "PENDING_<uuid>" so the existing "Finish setup" banner
--     surfaces and prompts them to add their real number
--   - email + auth_user_id wired through
--
-- Bank details remain null until the user fills them in at /dashboard/settings.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create an organizer row if the user signed up with an email
  -- and doesn't already have one (idempotent for retries/replays).
  if new.email is not null and not exists (
    select 1 from public.organizers where auth_user_id = new.id
  ) then
    insert into public.organizers (name, phone, email, auth_user_id)
    values (
      split_part(new.email, '@', 1),
      'PENDING_' || new.id::text,
      new.email,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill: any existing auth users without an organizer row get one too.
insert into public.organizers (name, phone, email, auth_user_id)
select
  split_part(u.email, '@', 1),
  'PENDING_' || u.id::text,
  u.email,
  u.id
from auth.users u
left join public.organizers o on o.auth_user_id = u.id
where o.id is null and u.email is not null;
