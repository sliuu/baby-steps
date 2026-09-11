-- One-time: give the thirteen starter activities the icons they now seed with.
-- Run with `npm run adopt:icons`.
--
-- `seed.sql` decides what a *fresh* database gets, and every insert in it ends
-- `on conflict do nothing` so that running it twice is a no-op. Both of those
-- are right, and together they mean changing a mark in that file changes
-- nothing for anyone who already has the row. This is the other half: the same
-- thirteen pairs, as an update.
--
-- **It only touches a sticker still wearing the mark it was seeded with.** The
-- third column below is a guard, not documentation — if you have since given
-- Gym a different emoji, that is a decision, and this file is not entitled to
-- overwrite it. Nothing here matches a mark you chose yourself, so it is also
-- safe to run twice: the second run matches nothing, because the first one
-- already moved every row out of the way.
--
-- Placed marks are untouched. `day_activities` points at the activity, not at
-- its mark, so every square on every past month redraws with the new picture
-- and none of them move.
--
-- Not a schema migration and deliberately not in `supabase/migrations/`. The
-- column is unchanged — `mark text` held 'M' and it holds 'icon:sparkles' now,
-- and `validateDraft` accepts both. This is a content change to one dev
-- account, which is the same job `seed.sql` does.

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

-- What every sticker is holding now, icons last so the leftovers are the first
-- thing you read. Anything still listed as `character` is either a sticker you
-- made yourself or one whose mark you had already changed — both are yours to
-- re-pick in the edit dialog, and neither is a failure of the update above.
select
  case when mark like 'icon:%' then 'icon' else 'character' end as kind,
  name,
  mark
from public.activities
order by kind desc, name;
