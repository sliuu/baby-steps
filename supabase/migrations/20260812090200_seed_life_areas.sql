-- Step 4 · The six life areas, created the moment a user appears.
--
-- These are required app data, fixed by the spec — not sample data. So they
-- belong in the schema, created by the database itself. Sample stickers are
-- developer convenience and stay out of here entirely (npm run seed, later).

create function public.seed_life_areas(for_user uuid)
returns void
language sql
-- security definer: runs as the function's owner, not the caller. That is what
-- lets it insert rows for a user who, at this moment, has no session and could
-- not pass the RLS check themselves.
security definer
-- Empty search_path so a schema planted on the caller's path can't shadow a
-- table name and hijack a definer-rights function. Everything below is
-- therefore fully qualified.
set search_path = ''
as $$
  insert into public.life_areas (user_id, name, slug, color_key, sort_order)
  values
    (for_user, 'Spirituality',       'spirituality', 'red',    1),
    (for_user, 'Exercise',           'exercise',     'blue',   2),
    (for_user, 'Work',               'work',         'orange', 3),
    (for_user, 'Creativity & Play',  'creativity',   'yellow', 4),
    (for_user, 'Romance & Adventure','romance',      'green',  5),
    (for_user, 'Friends & Family',   'friends',      'purple', 6)
  on conflict (user_id, slug) do nothing;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_life_areas(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who signed in during Step 3 already exists in auth.users and so never
-- fired the trigger. Idempotent, thanks to the on conflict above.
select public.seed_life_areas(id) from auth.users;
