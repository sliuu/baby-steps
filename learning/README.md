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

## Step 6 · Stickers on their days

1. Stickers are fetched on the server and arrive as finished HTML. Still no spinner.
2. They come back as a `Map` keyed by day, so each of the 42 cells does one lookup instead of scanning everything.
3. *All* of them, not one month — so arrowing to September needs no request at all.
4. A day is `{ activities: [], mood: null }` — the shape of `unique (user_id, day)`, written into the type.
5. `npm run seed` fills a plausible two months. `npm run seed:reset` empties it.

**Design consequence:** two kinds of thing on a day need two treatments, not one component with a flag. Activities are pastel filled circles wrapping under the date; the mood is an outlined face in plain ink, up on the date's own line. Different shape, weight, and position — legible apart at a glance, and the mood never competes with the six area hues.

**Second one:** a sticker's fill is the *soft* end of its ramp, and the mark is always `--ink`. Six saturated circles shout over the date they annotate, and a light fill would have re-created the Step 5 bug where legibility depended on a second token being right.

---

## Step 7 · The sticker tray

1. The tray takes a finished list and draws it. No query, no state, no idea where the data came from.
2. `CalendarView` fetches; `StickerTray` renders. Swapping either one doesn't touch the other.
3. The *same* `StickerMark` draws a sticker in the tray and on a day — no variant prop, no second component.
4. That works because it asks for `StickerFace` — name, mark, colour — not a row from either table.
5. `TrayGroup` doesn't know if it's holding activities or moods. It takes a label and a list.

**Design consequence:** the seam is "who fetches" versus "who draws". Anything that only draws can be moved, reused, or restyled without a thought about loading — which is why Step 8 can wrap the tray in a drag context and change nothing about the data.

**Second one:** two rows in two tables look identical on screen. The shared type is the three fields they draw, not the rows themselves — the ids stay separate because they mean different things (an activity you own vs. one placement of it on a day).

---

## Step 8 · Drag and drop

1. Pick a sticker up in the tray, drop it on a day, and it's there — through a refresh.
2. It appears the instant you let go, *before* the database has answered. If the write fails it vanishes and a line of text says why.
3. Dropping a mood on a day that already has one replaces it. That's not a branch anyone wrote — it's `unique (user_id, day)` doing it.
4. The tray and the grid moved into one component, `CalendarBoard`, because a drag has to be inside something that contains both ends of it.
5. The whole calendar is in the browser bundle now. `CalendarView` kept the only part that mattered: the fetching.

**Design consequence:** the app can now lie for half a second, on purpose. Drawing the sticker before the server confirms it is what makes a drag feel physical — and the price is that every optimistic redraw is a second copy of a rule the server also has, which has to be kept honest. There are exactly two of those here, both in `CalendarBoard` → `withDrop`.

**Second one:** feedback is the interaction. A sticker that lifts, a square that lights up under it, an original that stays put so the list doesn't shuffle under your hand — remove any one and the same drag stops feeling like moving an object.

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
| A sticker appears on drop, then disappears | the write failed; the optimistic copy expired and fell back to the server's | `CalendarBoard.tsx` → `useOptimistic` |
| A dropped sticker flickers or doubles | the optimistic redraw and the server disagree about the same rule | `CalendarBoard.tsx` → `withDrop` |
| The wrong square lights up mid-drag | collision was measured from the dragged item's centre, not the cursor | `CalendarBoard.tsx` → `collisionDetection` |
| A scrolling box scrolls sideways too | `overflow-y: auto` promotes `overflow-x` from `visible` to `auto`; something inside is bleeding past the edge | `CalendarBoard.tsx` → the rail `<aside>` |
| One thing in the rail sits indented from the rest | it isn't carrying `TRAY_INSET` — everything in there shares one gutter | `lib/layout.ts` |
| A character in a round button sits off-centre | flex centres the glyph's line box, not its ink. Draw it instead of typing it | `StickerTray.tsx` → the `+` |
| Nothing drags on a phone, fine on a mouse | the element is missing `touch-none`, so the browser took the gesture for scrolling | `DraggableSticker.tsx` |
| A click on a sticker does nothing | it started a drag instead; `activationConstraint` sets how far a press must travel first | same |
| The page doesn't update after a write | the action returned without `refresh()` — nothing told the router to re-render | `app/actions/stickers.ts` |
| A joined query is typed as an array when it's one row | the client has no `<Database>` type, so it can't tell a many-to-one join from one-to-many | `lib/supabase/server.ts` |
| Types disagree with the database after a migration | they're generated, not live. Run `npm run types:db` | `lib/database.types.ts` |
| Re-running a seed script doubles the data | `on conflict do nothing` needs a matching unique constraint, or it catches nothing | `..._unique_activity_names.sql` |
| A flex child overflows and shoves its sibling off-screen | flex items won't shrink below their content width until you add `min-w-0` | `CalendarView.tsx` |
| The nav's wordmark stops lining up with the page below | the two containers disagree about max-width | `lib/layout.ts` |
| A screen reader says a label twice | the icon carries its own name and the text repeats it — hide one | `TrayGroup.tsx` → `TrayRow` |
| `truncate` does nothing and the text overflows | same `min-w-0` rule: a flex item won't shrink below its text | `TrayGroup.tsx` |
| A joined query drops rows that have no children | the embed was `!inner`, or a filter on it made it behave that way | `lib/queries/activities.ts` |

---

## The floor

Below this line, trust it and look it up if it breaks:

OAuth's token exchange · JWT signatures · how cookies travel · Postgres query planning ·
React's reconciler · how Tailwind compiles · what Next does to your bundle

Not knowing what's under the floor is a choice, not a gap. Raise the floor when a
bug drags you under it, and not before.
