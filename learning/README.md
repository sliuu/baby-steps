# Baby Steps — the whole project, five lines a step

Read this. The long `.html` docs are reference — open one only when the symptom
index at the bottom sends you there.

---

## Step 1 · Scaffold and design tokens

1. Colors and fonts are CSS variables, not Tailwind's `dark:` prefix.
2. One class name (`bg-surface`) resolves to two different values by theme.
3. So there is zero `dark:` anywhere in our own code, and never should be.
4. shadcn was rethemed by pointing its variables at ours. Its files stay untouched.
5. A blocking script in `<head>` sets the theme before first paint, so there's no flash.

**Design consequence:** you restyle the entire app by editing one block in `app/globals.css`.

---

## Step 2 · The shell

1. A top bar: wordmark, two tabs, moon icon, avatar.
2. Clicking a tab swaps the page body. No reload, no URL change.
3. One value — `page` — decides which tab is filled and what shows below.
4. That value lives in `AppShell`, because two components need it.
5. The calendar and trends views stay on the server, passed in as props.

**Design consequence:** state lives at the lowest component that contains everyone who needs it. Push it up only when a second thing needs to read it.

---

## Step 3 · Sign in

1. You never give Baby Steps your Google password. Google vouches for you instead.
2. Signing in ends with two tokens in cookies your JavaScript cannot read.
3. `proxy.ts` runs before every request, refreshes those tokens, bounces strangers to `/login`.
4. Supabase is the registered OAuth client — that's why Google shows a `supabase.co` address.
5. The avatar is a real menu now, with your name and a sign-out button.

**Design consequence:** the browser can't tell whether you're signed in, so auth branches happen on the server. There's no signed-out flash to design around — and a panel that shouldn't be seen must not *render*, not merely hide.

---

## Step 4 · The database

1. The schema is `.sql` files in the repo, applied in order. The database is reproducible.
2. Row-level security filters every query by user, inside Postgres, not in our code.
3. "One mood per day" is a `UNIQUE` constraint, so the UI can't get it wrong.
4. A trigger creates the six life areas the moment an account exists.
5. The chips on the Calendar page are real rows.

**Design consequence:** rules you'd normally enforce with UI logic live in the table instead. Dropping a mood on an occupied day isn't a branch you write — it's one call, and the database decides.

---

## Step 5 · The month grid

1. Six rows always, even when five would do, so the page never jumps.
2. Days are `"2026-08-12"` strings everywhere outside `lib/dates.ts`.
3. The server doesn't know what day it is where you are, so "today" appears a beat after first paint.
4. Today is a ring, not a filled circle — a fill needs inverted text, and that broke once.
5. Every cell carries `data-day`. Step 8 drops stickers onto it.

**Design consequence:** anything only the browser knows — the clock, the theme, `localStorage` — arrives one frame late. Whatever marks it must not shift layout when it appears.

---

## The three things that carry across all of it

**Data arrives before the HTML does.** A server component awaits the database and sends finished markup. There's no spinner to design unless you deliberately add one.

**Browser-only knowledge is one frame late.** The clock, the theme, anything in `localStorage`. Design the first frame without it.

**Some classes silently do nothing.** Not an error — just nothing. First thing to check when a style has no effect.

---

## Symptom index

Read left to right. Nothing here needs to be memorized.

| You see | It's because | Where |
|---|---|---|
| A Tailwind class does nothing at all | the token was never published in the `@theme` block | `app/globals.css` |
| A class built from a variable does nothing | Tailwind scans source *text*; it never runs your code | `lib/palette.ts` |
| An env var is `undefined` in the browser | `process.env.NEXT_PUBLIC_X` must appear literally — no helper function | `lib/supabase/env.ts` |
| Two Tailwind classes fight and the wrong one wins | order is decided by the compiled stylesheet, not your template | `DayCell.tsx` → `numeralClasses()` |
| React warns about a hydration mismatch | something read the clock, the DOM, or storage during render | `MonthGrid.tsx` → `useSyncExternalStore` |
| A date lands one day off, but only at night | something used `toISOString()`, which converts to UTC first | `lib/dates.ts` → `toDayString` |
| The whole page jumps on an arrow press | a month drew five rows instead of six | `lib/dates.ts` → `WEEKS_IN_GRID` |
| A query returns `[]` instead of an error | RLS worked. The rows exist and were filtered out | `supabase/migrations/*_rls.sql` |
| A table is wide open despite having policies | `enable row level security` was never run — policies alone are inert | same |

---

## The floor

Below this line, trust it and look it up if it breaks:

OAuth's token exchange · JWT signatures · how cookies travel · Postgres query planning ·
React's reconciler · how Tailwind compiles · what Next does to your bundle

Not knowing what's under the floor is a choice, not a gap. Raise the floor when a
bug drags you under it, and not before.
