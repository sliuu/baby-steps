-- Marks on a day get an order you chose.
--
-- Until now the order was `created_at` — the order you happened to drop them
-- in, which is a fact about the past rather than a decision. Reading a day left
-- to right is reading something, so which mark comes first should be yours to
-- set.
--
-- `integer`, not a fraction. The tempting trick is to store gaps (0, 100, 200)
-- and insert between two neighbours by averaging, so a reorder is one UPDATE.
-- It's the right answer at a scale this table will never see: a day holds a
-- handful of marks, renumbering all of them is one round trip either way, and
-- halving intervals eventually runs out of room and needs a rebalance pass
-- nobody remembers to write. Dense 0..n-1 is the boring version that stays
-- correct.
alter table public.day_activities
  add column position integer not null default 0;

-- Existing rows keep the order they already appear in, which is the order the
-- query has been using all along. Without this every day collapses to a pile of
-- zeroes and the tiebreak below decides — same result today, but only by luck,
-- and the first reorder on a day would scramble the rest of it.
with ordered as (
  select
    id,
    row_number() over (
      partition by user_id, day
      order by created_at, id
    ) - 1 as pos
  from public.day_activities
)
update public.day_activities da
set position = ordered.pos
from ordered
where ordered.id = da.id;

-- No unique constraint on (user_id, day, position), deliberately. A reorder
-- writes every position on the day in one statement, and a non-deferrable
-- unique index checks per row — so a plain swap trips over itself halfway
-- through even though the final state is valid. The dense numbering is
-- maintained by the one action that writes it, and `created_at` breaks ties if
-- it ever isn't.
create index day_activities_day_position_idx
  on public.day_activities (user_id, day, position);
