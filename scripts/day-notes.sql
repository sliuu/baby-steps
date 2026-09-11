-- A short note per day. Run once with `npm run db:notes`.
--
-- **This is a schema change, and the app will not load until it has run.**
-- `getStickersByDay` selects from `day_notes` alongside `day_activities` and
-- `day_moods`, and a missing relation is an error, not an empty result.
--
-- Shaped exactly like `day_moods`, because it is the same kind of thing: one
-- row per day at most, owned by one person, replaced rather than appended to.
-- That gives the write side an upsert on `(user_id, day)` and nothing else —
-- no positions to renumber, no ordering to preserve, which is what separates
-- both of these from `day_activities`.
--
-- The note is `not null`, and clearing one deletes the row rather than storing
-- an empty string. Two representations of "no note" is one more than the
-- calendar can tell apart, and the delete is what keeps a day you typed into
-- and then emptied identical to a day you never touched.
--
-- 280 characters, enforced here as well as in the textarea. "short notes or
-- summaries" is the brief; a limit at the column is what makes that true of
-- the data rather than of the form. The number is deliberately generous —
-- long enough for two or three sentences, short enough that the column stays a
-- margin note and not a journal.
--
-- Idempotent: `if not exists` throughout, so a second run changes nothing.

begin;

create table if not exists public.day_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null,
  note       text        not null check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Every read is "the notes for this account", the same shape the RLS policies
-- below filter on, and the unique constraint above already indexes exactly
-- that pair — so there is no second index to add.

alter table public.day_notes enable row level security;

-- Four policies rather than one `for all`, matching the rest of the schema:
-- `using` is checked against rows that already exist and `with check` against
-- rows on their way in, and an insert has no existing row to test. Spelling
-- them out separately is what makes it impossible to write a row you then
-- cannot read.
--
-- `(select auth.uid())` and not a bare `auth.uid()`. The subquery form is
-- evaluated once per statement instead of once per row.

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
