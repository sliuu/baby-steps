-- Clears sample data back to empty. Run with `npm run seed:reset`.
--
-- Deletes placed stickers and moods but keeps the activities, because those are
-- what the tray shows in Step 7 — resetting is meant to empty the calendar, not
-- take the palette away with it. Life areas are never touched: they're real app
-- data, created by the trigger in Step 4.

begin;

delete from public.day_activities;
delete from public.day_moods;

commit;

select
  (select count(*) from public.activities)      as activities_kept,
  (select count(*) from public.day_activities)  as placed_stickers,
  (select count(*) from public.day_moods)       as moods;
