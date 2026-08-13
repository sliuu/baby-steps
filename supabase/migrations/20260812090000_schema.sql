-- Step 4 · The four tables.
--
-- Every table carries user_id. That column is what row-level security keys on,
-- so it is not redundant even where it could be derived through a join.

create table life_areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  slug        text not null,
  -- Names a colour ramp ('red', 'blue', …), never a hex value. A ramp resolves
  -- differently per theme; a hex would be stuck in one of them.
  color_key   text not null,
  sort_order  integer not null,
  created_at  timestamptz not null default now(),

  unique (user_id, slug),
  -- Lets child tables point at (id, user_id) as a pair. See activities below.
  unique (id, user_id)
);

create table activities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  life_area_id  uuid not null,
  name          text not null,
  -- One grapheme — a letter or an emoji. Length is validated in the app with
  -- Intl.Segmenter, because SQL length() counts code points and disagrees with
  -- humans about emoji. Step 10.
  mark          text not null,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),

  -- ON DELETE RESTRICT, not CASCADE: deleting a life area must not silently
  -- delete months of history. The archived flag is how you retire one.
  foreign key (life_area_id, user_id)
    references life_areas (id, user_id) on delete restrict,

  unique (id, user_id)
);

create table day_activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- A calendar day, not a timestamp. Stored and compared as YYYY-MM-DD so no
  -- timezone ever shifts a sticker onto the previous day.
  day          date not null,
  activity_id  uuid not null,
  created_at   timestamptz not null default now(),

  foreign key (activity_id, user_id)
    references activities (id, user_id) on delete cascade,

  -- A day may hold any number of stickers, but not the same one twice.
  unique (user_id, day, activity_id)
);

create table day_moods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  mood        text not null check (mood in ('great', 'good', 'okay', 'low', 'rough')),
  created_at  timestamptz not null default now(),

  -- This one constraint is what makes "one mood per day" true. Dropping a mood
  -- on an occupied day is an upsert, not a UI branch.
  unique (user_id, day)
);

-- The unique constraints above already index (user_id, day, activity_id) and
-- (user_id, day). These cover the joins that don't get one for free.
create index activities_user_area_idx on activities (user_id, life_area_id);
create index day_activities_activity_idx on day_activities (activity_id);
