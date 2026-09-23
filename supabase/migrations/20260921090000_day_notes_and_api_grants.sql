-- Keep the schema complete under `supabase db reset` / `supabase db push`, and
-- expose only the operations the browser app actually uses. New Supabase
-- projects no longer auto-grant Data API access to newly created tables.

begin;

create table if not exists public.day_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  note       text        not null check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.day_notes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'read own day notes') then
    create policy "read own day notes" on public.day_notes
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'write own day notes') then
    create policy "write own day notes" on public.day_notes
      for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'update own day notes') then
    create policy "update own day notes" on public.day_notes
      for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'delete own day notes') then
    create policy "delete own day notes" on public.day_notes
      for delete to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

revoke all on table
  public.life_areas,
  public.activities,
  public.day_activities,
  public.day_moods,
  public.day_notes
from public, anon;

grant select, update on table public.life_areas to authenticated;
grant select, insert, update, delete on table
  public.activities,
  public.day_activities,
  public.day_moods,
  public.day_notes
to authenticated;

grant all on table
  public.life_areas,
  public.activities,
  public.day_activities,
  public.day_moods,
  public.day_notes
to service_role;

-- These SECURITY DEFINER functions exist for the auth.users trigger, not as
-- browser-callable RPC endpoints.
revoke execute on function public.seed_life_areas(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
