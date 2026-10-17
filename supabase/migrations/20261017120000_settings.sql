-- Settings: petal thresholds, week start, and self-serve account deletion.

begin;

alter table public.profiles
  add column petal_weeks    smallint not null default 3 check (petal_weeks between 1 and 12),
  add column petal_small    smallint not null default 1,
  add column petal_medium   smallint not null default 3,
  add column petal_large    smallint not null default 6,
  add column week_starts_on smallint not null default 0 check (week_starts_on in (0, 1)),
  add constraint petal_order check (
    petal_small >= 1 and petal_small < petal_medium and petal_medium < petal_large
    and petal_large <= 999
  );

-- Every user table cascades from auth.users.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
