-- Step 4 · Row-level security.
--
-- Two things happen here, and the order matters:
--
--   1. enable row level security  → the table becomes deny-by-default
--   2. create policy             → carve out exactly what is allowed
--
-- Step 1 alone locks everyone out. Step 2 without step 1 does nothing at all —
-- policies on a table without RLS enabled are inert. That second case is the
-- dangerous one, because the app keeps working and looks fine.
--
-- Notes on the shape of every policy below:
--
--   using       → which existing rows this operation may see or touch
--   with check  → what a row is allowed to look like after writing
--                 (INSERT has no existing row, so it only takes with check)
--
--   to authenticated  → don't even evaluate this for signed-out requests
--
--   (select auth.uid())  → the parentheses are not decoration. Wrapped in a
--   select, Postgres evaluates auth.uid() once per query instead of once per
--   row, which is the difference between a fast scan and a slow one.

alter table life_areas     enable row level security;
alter table activities     enable row level security;
alter table day_activities enable row level security;
alter table day_moods      enable row level security;

-- life_areas ---------------------------------------------------------------
-- No insert or delete policy: the six rows are created by a trigger that runs
-- as the table owner and bypasses RLS. The app may read and rename them, never
-- add or remove them. That is a v2 feature and this is how we keep it honest.

create policy "read own life areas" on life_areas
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "update own life areas" on life_areas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- activities ---------------------------------------------------------------

create policy "read own activities" on activities
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own activities" on activities
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own activities" on activities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own activities" on activities
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- day_activities -----------------------------------------------------------

create policy "read own day activities" on day_activities
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own day activities" on day_activities
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own day activities" on day_activities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own day activities" on day_activities
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- day_moods ----------------------------------------------------------------

create policy "read own day moods" on day_moods
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own day moods" on day_moods
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "update own day moods" on day_moods
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own day moods" on day_moods
  for delete to authenticated
  using ((select auth.uid()) = user_id);
