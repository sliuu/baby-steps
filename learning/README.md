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

**Design consequence:** the app can now lie for half a second, on purpose. Drawing the sticker before the server confirms it is what makes a drag feel physical — and the price is that every optimistic redraw is a second copy of a rule the server also has, which has to be kept honest. There are exactly two of those here, both in `CalendarBoard` → `applyChange`.

**Second one:** feedback is the interaction. A sticker that lifts, a square that lights up under it, an original that stays put so the list doesn't shuffle under your hand — remove any one and the same drag stops feeling like moving an object.

---

## Step 9 · The day modal

1. Click any day and a panel opens on it: every sticker as a checkbox, the mood as a radio.
2. Ticking a box and dragging a sticker are the *same event* by the time anything acts on them — both build a `CalendarChange` and hand it to one `commit()`.
3. So the modal has no rules of its own, no optimistic copy, and no idea which server action it just caused.
4. It also has no state. The boxes are drawn from the same optimistic Map the grid draws from, so a failed write un-ticks its own box with nothing written to do it.
5. Escape, click-outside, the focus trap, and returning focus to the day you came from are all Radix's, in `components/ui/dialog.tsx`.

**`npm test` exists now** — Node's own runner, no dependency. It covers one function, `applyChange`, because that's the only place the app keeps a second copy of a rule the database also enforces. Tests earn their keep on things that can drift silently, not on things that break loudly.

**Design consequence:** two ways to do one thing is a maintenance bill unless they meet early. They meet at `CalendarChange` — a union naming everything that can happen to a day — so a new interface later (a keyboard shortcut, a bulk edit) writes one of those and inherits the optimistic redraw, the action, and the error line for free. The alternative is the modal reimplementing the drag's rules slightly differently and the two disagreeing under some condition nobody thought to check.

**Second one:** a picker must be able to hold every state its data can be in. The five moods are the interesting values, but "no mood" is the state most days are in — so it's a sixth radio, and choosing it deletes the row. Without it a mis-click is permanent.

---

## Step 10 · Making a sticker

1. The `+` opens a small form — a mark, a name, a life area — and the sticker is in the tray by the time it closes.
2. The form posts to a *function*, not a URL. `createActivity` is a Server Action, so there's no route to write, no `fetch` to call, and no JSON on either side.
3. The same `validateDraft` runs in the browser and again on the server. One function, so the quick check and the real check can't drift and the sentence is identical.
4. "One character" means one **grapheme**. `🏋️` is 1 — not 3 (`.length`) and not 2 (code points). That's `Intl.Segmenter`, in `lib/graphemes.ts`.
5. Closing the dialog *is* the reset. The fields live in a child that Radix unmounts, so there's no clearing code and no reopening onto last time's half-filled form.

**Design consequence:** the same rule is now checked in three places, at three strengths, and that's the design rather than duplication. The browser check is for speed and tone — it costs no round trip and is the only one that can point at a field while you're still typing. The Server Action's check is the one that counts, because a Server Action is a POST endpoint and the form in front of it is a convenience, not a gate. The database's constraints are the ones that can't be skipped by any client at all. Push each rule as far down as it will go: "this area is yours" is a composite foreign key and so is never written as code, and "this name is unique in this area" is an index — which is why the action reads Postgres's refusal codes instead of asking first.

**Second one:** one rule refused to go down. Postgres's `length('🏋️')` is **2** — it counts code points — so "exactly one character" cannot be a `CHECK` constraint, and the only copy of it lives in TypeScript. That is exactly the shape of thing `npm test` is for: a rule with no backstop underneath it. The constraints aren't tested, because they can't drift; `validateDraft` and `graphemeCount` are, because they're the last word.

---

## Step 11 · Highlight mode

1. Click a sticker and every day you did it tints in its own colour; everything else recedes. Click a life-area label and the whole area lights at once.
2. Nothing about it is saved. Refresh and it's gone — that's not a gap, it's the point. It's a way of *looking* at the month, not a fact about it.
3. The tray sets it and the grid draws it, and those two are siblings — so the value lives in `CalendarBoard`, the lowest component containing both. Same rule as Step 2, third time it's decided the answer.
4. A cell never asks "am I highlighted?" The grid already holds the day's stickers from its one `Map` lookup, so it answers with `dayMatches` and passes down a `lit` boolean.
5. One sticker and a whole area are the same thing by the time anything draws them — a *set* of activity ids. Only the size differs, so nothing downstream has two branches.

**Design consequence:** highlighting is subtraction. The selected marks stay exactly as they were and everything else drops to 35% — nothing gets brighter, bolder, or bigger, because a page where the answer shouts is a page you can only use one way. What *doesn't* fade is the load-bearing half of the decision: the numerals, the today ring, and the grid lines all hold full strength, so the calendar is still a calendar while you're looking through it. Fade those and every selection would cost you the ability to read a date.

**Second one:** a mode with no visible way out is a trap, so there are three — click the lit row again, click "clear" under the heading, or press Escape. The row can scroll off the bottom of a long rail and Escape is invisible, which is why the line under the heading changes to say what's showing and offer the exit. The same reasoning runs the keyboard: Space lifts a sticker and **Enter** highlights it, because dnd-kit claims both by default and a keyboard user would otherwise have no way to reach this feature at all.

---

## Step 12 · Counting

1. The Trends tab is real: six life areas, their marks, their share, and a range dropdown above them.
2. Switching range makes **no request**. Every placement is already in the browser — the calendar fetched all of them back in Step 6 — so a range change is one pass over memory.
3. A range is a *rule*, not a pair of dates. "This month" stores nothing; `resolveBounds` turns the rule plus today into two edges on every render, so a tab left open overnight isn't still reporting on yesterday.
4. Those edges are strings, and comparing them is just `<=`. `"2026-08-09" < "2026-08-10"` for the same reason `"a" < "b"` — there is no `Date` object and no timezone anywhere in `lib/analytics.ts`.
5. The percentages carry **one decimal place**, and each one is rounded on its own — so the column sometimes reads 100.1, and the total row prints that rather than a flat "100%".

**Design consequence:** "where do you aggregate" has a real answer, and it's not always the database. Postgres could `group by` and return six rows, and that would be one request every time you touch the dropdown, re-deriving numbers from rows the browser is *already holding* for the calendar. Counting here costs one pass over an array in memory and makes the range control feel like it has no latency, because it doesn't. The tradeoff is honest and has a stated expiry: this works because the calendar already ships every placement, so the day that stops being true — a few thousand rows, per the note on `getStickersByDay` — both move to the server together. Aggregating close to the data is the right instinct; it's just not free when the data is already here.

**Second one:** `useMemo` here is not about speed. Six areas and a few hundred marks is nothing to count — you could redo it every render and never see it. It's about **identity**: the tally object becomes props for the table now and for three charts in Steps 13 and 14, and a fresh object every render means every one of them re-renders every time anything on the page changes. Memoizing is what makes the things underneath it *skippable*. That's the usual reason to reach for it, and "it was slow" usually isn't.

**Third one, learned the hard way:** the first version apportioned. Floor every row, hand the leftover points to whichever rows lost most in the flooring — largest-remainder, the method that turns votes into seats — and the column sums to exactly 100 by construction. Textbook, and wrong here. Real data produced two areas at 11 marks out of 63, and apportionment has to give a single leftover point to *one* of two equal claims, so they came out 18% and 17%. The table sorts by count, so those two rows landed adjacent: same number of marks, different share, stacked. **A column that sums to 99 makes you doubt the last digit; two equal counts with unequal shares makes you doubt the whole table.** Equal in, equal out is the stronger promise, and only rounding each row independently can keep it. The decimal place is what makes that cheap — ties land on the same number, and the drift shrinks from a whole point to a tenth, which reads as rounding rather than error. The general shape: a rule that's provably correct in aggregate can still be locally absurd, and a table is read locally, one row against its neighbour.

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
| A hydration mismatch on an `id`-ish attribute, worse the longer the server runs | the value comes from a counter in a module variable — fresh on the client, but the server's copy survives every request | `CalendarBoard.tsx` → `DndContext id` |
| A date lands one day off, but only at night | something used `toISOString()`, which converts to UTC first | `lib/dates.ts` → `toDayString` |
| The whole page jumps on an arrow press | a month drew five rows instead of six | `lib/dates.ts` → `WEEKS_IN_GRID` |
| A query returns `[]` instead of an error | RLS worked. The rows exist and were filtered out | `supabase/migrations/*_rls.sql` |
| A table is wide open despite having policies | `enable row level security` was never run — policies alone are inert | same |
| A sticker appears on drop, then disappears | the write failed; the optimistic copy expired and fell back to the server's | `CalendarBoard.tsx` → `useOptimistic` |
| A dropped sticker flickers or doubles | the optimistic redraw and the server disagree about the same rule | `CalendarBoard.tsx` → `applyChange` |
| A Client Component import breaks the build with `next/headers` | `import type` is erased and crosses freely; a **value** import is real code and drags its whole module graph | `lib/stickers.ts` → `NO_STICKERS` |
| A screen reader reads a cell as "20 Gym Meditation Great" | the container became a control, so its children's names got concatenated into its own | `DayCell.tsx` → `dayLabel()` |
| A focus ring is shaved off along one edge | the parent clips (`overflow-hidden`); use an inward `outline-offset`, not a ring | same |
| Contents drift to the middle after a div becomes a `<button>` | a button centres its own contents, and `display: block` doesn't stop it — declare a real `flex`/`grid` layout | same |
| The same hover tint looks right on a small row and heavy on a big one | tint is perceived by area; a larger surface needs a lower opacity to read the same | `DayCell.tsx` vs `DraggableSticker.tsx` |
| A hover band is either clamped to its text or indented from its heading | it needs padding *and* a matching negative margin on the scroll container — one decision, two numbers | `DayModal.tsx` → `ROW` / `SCROLL_PAD` |
| A test suite passes no matter what you break | it was never checked against a broken version; mutate the code on purpose once | `lib/changes.test.ts` |
| A radio resets to the last value you picked | the "nothing chosen" state has no value to hold, so it isn't really controlled | `DayModal.tsx` → `NO_MOOD` |
| The wrong square lights up mid-drag | collision was measured from the dragged item's centre, not the cursor | `CalendarBoard.tsx` → `collisionDetection` |
| A scrolling box scrolls sideways too | `overflow-y: auto` promotes `overflow-x` from `visible` to `auto`; something inside is bleeding past the edge | `CalendarBoard.tsx` → the rail `<aside>` |
| One thing in the rail sits indented from the rest | it isn't carrying `TRAY_INSET` — everything in there shares one gutter | `lib/layout.ts` |
| A character in a round button sits off-centre | flex centres the glyph's line box, not its ink. Draw it instead of typing it | `NewStickerForm.tsx` → the `+` |
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
| `maxLength={1}` accepts `A` but mangles `🏋️` | the attribute counts UTF-16 code units, so it truncates an emoji mid-surrogate-pair | `NewStickerForm.tsx` → the mark input |
| `"🏋️".length` is 3 and the database says 2 | three different questions: code units, code points, and characters as people see them | `lib/graphemes.ts` |
| A `CHECK` constraint can't express "one character" | SQL `length()` counts code points; there is no grapheme in Postgres | `lib/stickers.ts` → `validateDraft` |
| A dropdown's value never arrives in `FormData` | a Radix `Select` only renders its hidden native `<select>` when you give it `name` | `NewStickerForm.tsx` → the life-area `Select` |
| Opening a picker submits the form | a `<button>` inside a `<form>` submits by default; `type="button"` is load-bearing | same |
| A dialog reopens holding last time's typing | the state outlived the dialog. Move it into a child Radix unmounts on close | `NewStickerForm.tsx` → `StickerFields` |
| A Server Action wants `(previousState, formData)` | that's `useActionState`'s shape, not the action's. Wrap it in a client function | same → `submit` |
| An overlay hides the very thing it's pointing at | it needs `-z-10`, which paints *after* the element's background but *before* its in-flow children | `DayCell.tsx` → the wash layer |
| A negative `z-index` escapes and paints behind its parent | the parent never made a stacking context to contain it — add `isolate` | same |
| A translucent tint shows the grid lines through it | it was laid on the gap, not on a surface. Keep the base background underneath | same |
| A `bg-*/10` class looks fully opaque | Tailwind emits a solid fallback *and* a `color-mix` rule behind `@supports` — you're seeing the fallback | compiled CSS, not your code |
| A click and a drag both fire from one gesture | they don't: dnd-kit swallows the click in the capture phase once the distance constraint is met | `DraggableSticker.tsx` |
| A keyboard shortcut never fires inside a drag context | `KeyboardSensor` claims Space *and* Enter by default and `preventDefault`s them — narrow `keyboardCodes` | `CalendarBoard.tsx` |
| A clickable heading vanishes from a screen reader's heading list | the `<button>` must go *inside* the `<h3>`, not replace it | `TrayGroup.tsx` |
| A feature made of colour doesn't exist for a screen reader | nothing said it out loud; put it in the accessible name | `DayCell.tsx` → `dayLabel()` |
| A highlight lights the wrong days, or none | a placement's `id` is not the activity's `id` — match on `activityId` | `lib/highlight.ts` → `dayMatches` |
| Two rows show the same count but different percentages | the shares are apportioned, so a leftover point went to one of them; round each row on its own instead | `lib/analytics.ts` → `percent` |
| A percentage column adds up to 100.1 | independent rounding, on purpose — print the real sum in the total row rather than a flat "100%" | `AreaTable.tsx` → `columnTotal` |
| A decimal column looks ragged even in `tabular` | whole numbers are dropping their decimal; `toFixed(1)` everything so the points line up | `AreaTable.tsx` |
| Numbers twitch sideways as they change | proportional figures re-space the column when a 1 becomes a 7 — use `tabular` | `AreaTable.tsx` |
| A screen reader reads a table as a wall of digits | it needs real `<th scope>` and a `<caption>`, not a grid of divs | same |
| Two dates compare wrong when one has a single-digit day | zero padding is the whole reason `"2026-08-09" < "2026-08-10"` works | `lib/analytics.ts` → `inBounds` |
| A formatted date mismatches on hydration | `toLocaleDateString` uses the *runtime's* locale, and the server's isn't the browser's | `lib/dates.ts` → `formatDayShort` |
| A range picked end-first returns nothing | the edges arrive in click order; put them in date order once, centrally | `lib/analytics.ts` → `normalizeBounds` |
| Re-running `shadcn add` silently reverts a tweak | the CLI overwrites the files it owns — diff after every add | `components/ui/button.tsx` |
| The page looks inset from itself | the page gutter got applied twice, once by `<main>` and once below it | `TrendsBoard.tsx` |
| A chart changes shape when the data barely moved | something sorted the shared array; a ranking belongs in the view, not in the data | `AreaTable.tsx` → `ranked` |
| Sorting one component's list reorders another's | `sort` mutates in place — copy before sorting anything memoized upstream | same |
| A table of numbers has no period attached to it | its `<caption>` is the accessible name; hide it visually, don't delete it | `AreaTable.tsx` |
| A control announces the change but not the result | the value updates silently somewhere else — that element needs `aria-live` | `TrendsBoard.tsx` |

---

## The floor

Below this line, trust it and look it up if it breaks:

OAuth's token exchange · JWT signatures · how cookies travel · Postgres query planning ·
React's reconciler · how Tailwind compiles · what Next does to your bundle

Not knowing what's under the floor is a choice, not a gap. Raise the floor when a
bug drags you under it, and not before.
