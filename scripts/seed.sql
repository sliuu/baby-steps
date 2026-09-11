-- Sample data. Run with `npm run seed`, never automatically.
--
-- Drag-and-drop lands in Step 8. Until then this is the only way to get rows
-- into day_activities, so Steps 5 through 7 have something to render. Delete
-- this file and its package.json scripts once Step 8 works.
--
-- Idempotent: every insert ends in `on conflict do nothing`, so running it
-- twice changes nothing. `npm run seed:reset` clears the placed stickers.
--
-- Runs through the Management API, which has no session, so auth.uid() is null
-- and RLS would filter everything away. That's why each statement names the
-- user explicitly instead. Single-account project, so "the first account" is
-- unambiguous — this is a dev convenience, not app code.

begin;

create temporary table seed_user on commit drop as
  select id from auth.users order by created_at limit 1;

-- ---------------------------------------------------------------------------
-- Starter activities. Two or three per life area, matched to its slug.
--
-- The marks are icon names rather than letters now — `icon:` plus one of the
-- fifty-four ids in `lib/icons.ts`, which is what `StickerMark` resolves into a
-- Lucide component. They were single letters (M, J, R, Y) because a mark was
-- one grapheme and a letter is the one grapheme everyone can type; the picker
-- offers pictures first, so the starter set should look like what the app
-- makes rather than like the fallback.
--
-- Any id here has to exist in `lib/icons.ts`. `validateDraft` checks the set
-- rather than the shape, so a typo would be rejected by the form — but this
-- file bypasses the form, and a bad id lands as a sticker showing the words
-- "icon:dumbell".
-- ---------------------------------------------------------------------------
insert into public.activities (user_id, life_area_id, name, mark)
select u.id, la.id, a.name, a.mark
from seed_user u
join public.life_areas la on la.user_id = u.id
join (values
  ('spirituality', 'Meditation',   'icon:sparkles'),
  ('spirituality', 'Journaling',   'icon:notebook-pen'),
  ('exercise',     'Gym',          'icon:dumbbell'),
  ('exercise',     'Run',          'icon:footprints'),
  ('exercise',     'Yoga',         'icon:person-standing'),
  ('work',         'Deep work',    'icon:brain'),
  ('work',         'Inbox zero',   'icon:inbox'),
  ('creativity',   'Drawing',      'icon:pen-tool'),
  ('creativity',   'Piano',        'icon:piano'),
  ('romance',      'Date night',   'icon:heart'),
  ('romance',      'Adventure',    'icon:mountain'),
  ('friends',      'Called home',  'icon:phone-call'),
  ('friends',      'Saw friends',  'icon:handshake')
) as a(area_slug, name, mark) on a.area_slug = la.slug
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Placed stickers, across this month and last. Deterministic rather than
-- random, so re-seeding after a reset gives the same calendar back.
--
-- The pattern: each activity lands on days whose day-of-month hits its own
-- stride. Uneven strides mean days end up with different numbers of stickers,
-- which is the point — a calendar where every day looks identical wouldn't
-- show whether the wrapping and spacing actually work.
-- ---------------------------------------------------------------------------
insert into public.day_activities (user_id, day, activity_id)
select u.id, d.day, act.id
from seed_user u
cross join generate_series(
  date_trunc('month', current_date - interval '1 month')::date,
  current_date,
  interval '1 day'
) as d(day)
join lateral (
  select a.id, a.name,
         row_number() over (order by a.name) as n
  from public.activities a
  where a.user_id = u.id
) as act on (extract(day from d.day)::int + act.n) % (act.n + 2) = 0
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- One mood per day, on most days but not all — the gaps are what make the
-- UNIQUE constraint and the "no mood yet" state visible.
-- ---------------------------------------------------------------------------
insert into public.day_moods (user_id, day, mood)
select u.id, d.day,
  (array['great', 'good', 'okay', 'low', 'rough'])[
    (extract(day from d.day)::int % 5) + 1
  ]
from seed_user u
cross join generate_series(
  date_trunc('month', current_date - interval '1 month')::date,
  current_date,
  interval '1 day'
) as d(day)
where extract(day from d.day)::int % 4 <> 0
on conflict do nothing;

commit;

select
  (select count(*) from public.activities)      as activities,
  (select count(*) from public.day_activities)  as placed_stickers,
  (select count(*) from public.day_moods)       as moods;
