-- Legacy repair for deployments predating the day-notes migration. Idempotent.
-- Required: `getStickersByDay` errors without the table.
-- One row per day (upsert on user_id, day); clearing deletes, never ''.

begin;

create table if not exists public.day_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  note       text        not null check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- The unique (user_id, day) index already covers every read.

alter table public.day_notes enable row level security;

revoke all on table public.day_notes from public, anon;
grant select, insert, update, delete on table public.day_notes to authenticated;
grant all on table public.day_notes to service_role;

-- Split policies: insert has no existing row for `using`.
-- `(select auth.uid())` evaluates once per statement, not per row.

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

commit;

select
  (select count(*) from public.day_notes) as day_notes,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'day_notes') as policies;
