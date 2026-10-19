-- Empties the calendar (`npm run seed:reset`). Keeps activities and categories.

begin;

delete from public.day_activities;
delete from public.day_moods;

commit;

select
  (select count(*) from public.activities)      as activities_kept,
  (select count(*) from public.day_activities)  as placed_stickers,
  (select count(*) from public.day_moods)       as moods;
