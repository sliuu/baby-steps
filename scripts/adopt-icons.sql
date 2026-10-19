-- One-time: move starter activities to their icon marks. `npm run adopt:icons`.
-- seed.sql's `on conflict do nothing` won't update existing rows; this does.
-- Guarded on the seeded mark, so user-chosen marks are kept and reruns no-op.

begin;

update public.activities as a
set mark = starter.icon
from (values
  ('Meditation',   'M',  'icon:sparkles'),
  ('Journaling',   'J',  'icon:notebook-pen'),
  ('Gym',          '🏋', 'icon:dumbbell'),
  ('Run',          'R',  'icon:footprints'),
  ('Yoga',         'Y',  'icon:person-standing'),
  ('Deep work',    'D',  'icon:brain'),
  ('Inbox zero',   'I',  'icon:inbox'),
  ('Drawing',      '✎',  'icon:pen-tool'),
  ('Piano',        'P',  'icon:piano'),
  ('Date night',   '♥',  'icon:heart'),
  ('Adventure',    'A',  'icon:mountain'),
  ('Called home',  'C',  'icon:phone-call'),
  ('Saw friends',  'F',  'icon:handshake')
) as starter(name, seeded_mark, icon)
where a.name = starter.name
  and a.mark = starter.seeded_mark;

commit;

-- Leftover `character` marks are user-made or user-changed; not failures.
select
  case when mark like 'icon:%' then 'icon' else 'character' end as kind,
  name,
  mark
from public.activities
order by kind desc, name;
