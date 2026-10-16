# 01 · Rename life areas to categories

- **Status:** TODO
- **Commit:** —
- **Severity:** foundation (everything after this uses the new names)
- **Category:** refactor + migration
- **Estimated scope:** ~30 files, one migration, no visual change

## Problem

The product now calls the six groups **categories**. The code calls them life
areas in four different shapes, which makes every later plan harder to read:

- Table `life_areas`, column `activities.life_area_id`, function and trigger
  `seed_life_areas` (`supabase/migrations/20260812090000_schema.sql`,
  `20260812090200_seed_life_areas.sql`, RLS in `20260812090100_rls.sql`,
  unique index in `20260817120000_unique_activity_names.sql`, grants in
  `20260921090000_day_notes_and_api_grants.sql`).
- Identifiers: `areaId` (~63 uses), `areaName` (~45), `lifeAreaId` (~35),
  `areaOf` (~18), `lifeArea` (~10).
- Files: `components/trends/AreaBars.tsx`, plus `lib/{palette,habits,analytics,
  stickers,highlight,demo}.ts`, `lib/queries/{activities,stickers}.ts`,
  `app/actions/activities.ts`, tray forms, `DaySheet`, `DayModal`, `MonthDots`,
  `scripts/seed.sql`, and the tests next to those libs.

## Amended 2026-10-16: database names stay

The linked Supabase project is production, and this branch won't merge until
the redesign ships, so renaming the table would break the live site. Decision
(Stephanie): **the database keeps `life_areas`, `life_area_id` and
`seed_life_areas`**. No migration. Everything in TypeScript, CSS and copy is
renamed. The old names appear only where the code talks to the database
(`lib/queries/activities.ts`, `app/actions/activities.ts`, `scripts/seed*.sql`,
`lib/database.types.ts`). Later plans that write SQL against `categories`,
`category_id` or `seed_categories()` must translate those to the real names.
Steps 1, 2 and 5's table rename are skipped, and step 7's sweep is expected to
match those files.

## Target

The word "area" no longer appears in code, SQL or copy, except inside old
migrations (which are history and are never edited).

| Before | After |
| --- | --- |
| `life_areas` | `categories` |
| `activities.life_area_id` | `activities.category_id` |
| `seed_life_areas()` + trigger | `seed_categories()` + trigger |
| `LifeArea` / `lifeArea` | `Category` / `category` |
| `areaId`, `lifeAreaId` | `categoryId` |
| `areaName` | `categoryName` |
| `areaOf` | `categoryOf` |
| `AreaBars` | `CategoryBars` |
| "life area" in UI copy | "category" |

## Steps

1. **New migration** `supabase/migrations/<timestamp>_rename_life_areas_to_categories.sql`.
   Rename in place so data, ids and RLS survive:
   ```sql
   alter table public.life_areas rename to categories;
   alter table public.activities rename column life_area_id to category_id;
   -- rename indexes / constraints whose names contain life_area
   -- (list them with: select indexname from pg_indexes where indexname like '%life_area%';
   --  and the same for pg_constraint.conname)
   alter index ... rename to ...;
   -- policies keep working after a table rename, but rename them so names match
   alter policy "..." on public.categories rename to "...";
   -- replace the seed function and trigger
   drop trigger if exists ... on auth.users;
   drop function if exists public.seed_life_areas();
   create function public.seed_categories() ... -- same body, new table name
   create trigger ... after insert on auth.users ... execute function public.seed_categories();
   ```
   Copy the existing function body from `20260812090200_seed_life_areas.sql`
   and change only the table name. Keep `security definer` and the
   `search_path` setting exactly as they are. Do **not** change slugs or
   `color_key` values here; that is plan 02.
2. Apply it to the linked project, then `npm run types:db`.
3. Rename in TypeScript. Do it file by file with the TypeScript compiler as the
   guide (`npx tsc --noEmit` after each lib), not a blind find-and-replace:
   `area` also appears in unrelated words (`textarea`, `aria-`).
   Order: `lib/database.types.ts` (regenerated) → `lib/queries/*` →
   `lib/*.ts` + their tests → `app/actions/activities.ts` → components.
4. `git mv components/trends/AreaBars.tsx components/trends/CategoryBars.tsx`
   and update its import in `TrendsBoard.tsx`.
5. Update `scripts/seed.sql` (and any other `scripts/*.sql` that names the
   table) so `npm run seed` still works.
6. Search for user-facing copy: `grep -rni "life area\|area" components app`
   and change visible strings to "category" (lowercase).
7. Final sweep: `grep -rn "life_area\|lifeArea\|LifeArea\|areaId\|areaName\|areaOf" --include=*.ts --include=*.tsx --include=*.mts --include=*.sql . | grep -v node_modules | grep -v supabase/migrations/2026081`
   should print nothing except old migrations.

## Verify

- `npm test`, `npm run lint`, `npm run build` pass.
- Sign in as an existing user: today, month, week, trends show the same data as
  before. Add and remove a sticker. Create a new sticker in each category.
- Sign up a fresh test user: six categories are seeded.
- `/demo` still renders (it uses `lib/demo.ts`, which has no database).
