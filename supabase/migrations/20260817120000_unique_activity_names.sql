-- Step 6 · An activity name is unique within its life area.
--
-- Two stickers both called "Gym" under Exercise are indistinguishable once
-- they're circles on a day — same colour, same mark, no way to tell which one
-- you dropped. So it isn't a thing to prevent in the form; it's a thing the
-- table refuses.
--
-- Found by running the sample-data script twice and getting thirteen activities
-- twice. Its `on conflict do nothing` had no constraint to catch, so every run
-- inserted a fresh set with new ids. Step 10's "create your own stickers" form
-- would have had the same hole.
--
-- Scoped to the life area, not the user: "Reading" under Spirituality and
-- "Reading" under Creativity are genuinely different habits.

-- Any duplicates already in the table would make the constraint fail to build.
-- Keeps the earliest of each set and re-points its placed stickers, so no
-- history is lost.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, life_area_id, name
           order by created_at, id
         ) as n,
         first_value(id) over (
           partition by user_id, life_area_id, name
           order by created_at, id
         ) as keeper
  from public.activities
)
update public.day_activities da
set activity_id = r.keeper
from ranked r
where da.activity_id = r.id
  and r.n > 1
  -- Skip rows where the day already has the keeper: the unique constraint on
  -- (user_id, day, activity_id) would reject the update.
  and not exists (
    select 1 from public.day_activities other
    where other.user_id = da.user_id
      and other.day = da.day
      and other.activity_id = r.keeper
  );

-- Anything still pointing at a duplicate was a same-day collision above.
delete from public.day_activities da
using public.activities a
where da.activity_id = a.id
  and a.id in (
    select id from (
      select id,
             row_number() over (
               partition by user_id, life_area_id, name
               order by created_at, id
             ) as n
      from public.activities
    ) d where d.n > 1
  );

delete from public.activities a
where a.id in (
  select id from (
    select id,
           row_number() over (
             partition by user_id, life_area_id, name
             order by created_at, id
           ) as n
    from public.activities
  ) d where d.n > 1
);

alter table public.activities
  add constraint activities_user_area_name_key
  unique (user_id, life_area_id, name);
