# 12 · Onboarding: life pie, activities, stay in touch

- **Status:** TODO
- **Commit:** —
- **Severity:** high (new flow, new tables)
- **Category:** feature
- **Estimated scope:** one migration, `app/onboarding/*`, `app/actions/onboarding.ts`, `proxy.ts`

## Problem

New users land on an empty today screen with six categories and no stickers.

## Target

Three steps after first sign-in, then today.

### Data (one migration)

```sql
create table public.profiles (
  user_id        uuid primary key references auth.users on delete cascade,
  onboarded_at   timestamptz,
  phone          text,              -- E.164, nullable
  texts_opt_in   boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.category_ratings (   -- the onboarding life pie
  user_id      uuid not null references auth.users on delete cascade,
  category_id  uuid not null references public.categories on delete cascade,
  level        smallint not null check (level between 0 and 3),
  rated_at     timestamptz not null default now(),
  primary key (user_id, category_id, rated_at)
);
```

- RLS on both: owner-only select/insert/update, same pattern as
  `20260812090100_rls.sql`. Grants like `20260921090000_…`.
- Extend `seed_categories()` (or add a second trigger) to insert the
  `profiles` row on sign-up.
- Existing users: backfill `profiles` with `onboarded_at = now()` so they never
  see onboarding.
- No `is_custom` anywhere. Activities created here are ordinary rows.
- `npm run types:db`.

### Routing

- `app/onboarding/page.tsx` with a step param (`?step=1|2|3`) or three
  segments; read the Next 16 docs on routing and search params first.
- `proxy.ts`: signed-in user with `onboarded_at is null` → redirect to
  `/onboarding` (except `/onboarding`, `/auth/*`, static). Keep the check cheap
  (one row by primary key).
- Layout: `PageFrame` with logo only, plus "1 of 3" in `text-caption` on the
  right of the header.

### Step 1 · life pie

- Heading: "how full is each part of your life right now?" (placeholder copy).
- `LifePie` (plan 07), all levels start at 0. Category names around it.
- Verdict line under the pie, updates live (Stephanie's copy, exact):
  - spread ≤ 1: "looks like your pie is well balanced! let's try to keep it that way"
  - otherwise: "looks like {lowest} is trailing behind, but you're filling your cup with {highest}"
    (ties: pick the first in `sort_order`; names lowercase).
  Put this in `lib/balance.ts` as `verdict(levels, categories)` with tests.
- Filled button "next"; text link "back" hidden on step 1.
- Saves one `category_ratings` row per category.

### Step 2 · activities

- Heading: "what do you like to do?" (placeholder).
- For each category: name in `text-cat-<key>-text`, then its suggestion chips
  (`Chip`, plan 10) from `suggestionsFor`, then a dashed "add your own" chip that
  turns into an inline text input (enter to add; mark defaults to the category
  icon, editable later).
- Chosen chips switch to the `chosen` variant.
- "next" creates all chosen activities in one server action (use an upsert that
  respects the unique `(user_id, category_id, name)` index). Allowed to choose
  none.

### Step 3 · stay in touch

- Heading: "want a little nudge?" (placeholder).
- Explainer: gentle daily reminders by text; you can log by replying.
- Phone input (dashed bottom rule), US format, store E.164. Checkbox
  "text me reminders" (required to save a number). Small print: message
  frequency, "reply STOP to opt out", data rates. These lines are needed later
  for carrier registration; keep them even though sending is not built.
- Buttons: filled "set up texting" and text link "skip for now". Either sets
  `onboarded_at = now()` and goes to today.
- **No texts are sent.** This only stores consent.

> **Amended (as built):**
> - SQL translated: `category_id` references `life_areas`; no `seed_categories()`. The existing `handle_new_user()` is replaced to also insert the `profiles` row (same trigger).
> - Extra guards in the migration: `phone` must look like E.164, and a phone needs `texts_opt_in`. The ratings insert policy also checks the category is yours.
> - No category icon exists, so "add your own" takes the category's first suggestion's mark (`defaultMark()` in `lib/suggestions.ts`); unknown categories get the name's first letter.
> - Step is `?step=1|2|3`. Step 1 prefills from your latest ratings; step 2 shows stickers you already have as chosen (locked) chips; step 3 prefills your number.
> - The proxy fails open: no profile row, or a query error, means no redirect.
> - The three steps also render in `/dev/system` (plan 14's rule), and the verdict line there is now in.

## Verify

- New test user: sign in → step 1 → 2 → 3 → today, with chosen stickers in the
  tray.
- Existing user is never redirected.
- Refreshing mid-flow keeps saved steps.
- RLS: another user cannot read `profiles` or `category_ratings` rows
  (try with the anon key in a script).
- `npm test` covers `verdict()`.
