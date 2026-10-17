-- Dev sample data: `npm run seed` (idempotent); `seed:reset` clears stickers.
-- No session via the Management API, so RLS is moot: users are named explicitly.

begin;

create temporary table seed_user on commit drop as
  select id from auth.users order by created_at limit 1;

-- ---------------------------------------------------------------------------
-- Starter activities. Icon ids must exist in `lib/icons.ts`: this bypasses the form.
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
) as a(category_slug, name, mark) on a.category_slug = la.slug
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Placed stickers, deterministic. Uneven strides vary stickers per day.
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
-- One mood on most days; gaps show the "no mood yet" state.
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
