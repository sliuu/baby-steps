-- Redesign plan 12 · onboarding: profiles + life-pie ratings.
-- Plan SQL says categories/category_id/seed_categories; the DB keeps life_areas.

begin;

create table public.profiles (
  user_id       uuid primary key references auth.users on delete cascade,
  onboarded_at  timestamptz,
  -- E.164; only with consent.
  phone         text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  texts_opt_in  boolean not null default false,
  created_at    timestamptz not null default now(),
  check (phone is null or texts_opt_in)
);

create table public.category_ratings (
  user_id      uuid not null references auth.users on delete cascade,
  category_id  uuid not null references public.life_areas on delete cascade,
  level        smallint not null check (level between 0 and 3),
  rated_at     timestamptz not null default now(),
  primary key (user_id, category_id, rated_at)
);

alter table public.profiles         enable row level security;
alter table public.category_ratings enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "read own ratings" on public.category_ratings
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Category must be yours too.
create policy "insert own ratings" on public.category_ratings
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.life_areas
      where id = category_id and user_id = (select auth.uid())
    )
  );

create policy "update own ratings" on public.category_ratings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.profiles, public.category_ratings from public, anon;
grant select, insert, update on table public.profiles, public.category_ratings to authenticated;
grant all on table public.profiles, public.category_ratings to service_role;

-- Same trigger; now also opens a profile (onboarded_at null → onboarding).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_life_areas(new.id);
  insert into public.profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Existing users count as onboarded.
insert into public.profiles (user_id, onboarded_at)
  select id, now() from auth.users
  on conflict (user_id) do nothing;

commit;
