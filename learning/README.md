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

## Step 13 · The Life Star

1. The shape of a range, drawn: one spoke per life area, hairline hexagons at 25/50/75/100%, a neutral polygon with a coloured dot at each corner and "Area · count" outside it.
2. Hand-written SVG, no chart library — the whole thing is one function. `x = cx + r·cos(θ)`, `y = cy + r·sin(θ)`: an angle and a distance in, a point on the canvas out.
3. Distance from the centre is a share of the **busiest area**, not of the total — so the fullest spoke always touches the outer ring and the shape reads as balance rather than volume.
4. The spoke angle is `(2π / n) · i` and nothing anywhere writes `60`. Hand it seven areas and it draws seven.
5. `viewBox` is an invented coordinate system: the numbers are 520 wide because *we* said so, and the browser scales the drawing to whatever the card gives it. No code asks how wide anything is in pixels.

**Design consequence:** normalizing against the maximum is a decision about what the chart is *for*, and it has a cost worth saying out loud. Against the total, six areas at 20 marks each would draw a small hexagon at 16.7% and the shape would tell you nothing the number 20 didn't. Against the maximum, the same six draw a full regular hexagon — "evenly spread" — and a lopsided month draws a spike, whatever the totals were. The price is that the chart genuinely cannot tell you how big a month was: identical proportions at 60 marks and 600 draw the same polygon. That's why the counts are in the spoke labels. **The shape carries the balance and the labels carry the magnitude, and neither is asked to do the other's job** — which is the general answer to "this chart is ambiguous": add the other channel rather than compromising the first one.

**Second one:** the star draws `tally.areas` in the library's order and must never sort. `AreaTable` ranks biggest-first, from the same object, which is why Step 12 put the sort in the table and not in `tally`. A polygon whose vertices reorder by count changes shape for a reason that has nothing to do with the data — Spirituality moves from the top spoke to the left one and the outline is different because the *ranking* moved, not the counts. Then two ranges can't be compared, which is the one thing this chart is good at. **A ranking is a view's question; a fixed frame is the chart's requirement; both read one tally.**

**Third one:** floating point stops being trivia the moment you draw with it. `Math.cos(-Math.PI / 2)` is `6.123233995736766e-17`, not `0`, because π/2 isn't exactly representable in binary — so the top spoke, which points straight up, has a *positive* cosine. Anchor the labels with a bare `cos > 0` and the top one silently hangs a full name's width off to the right of a spoke pointing at neither side. It looks like a layout bug and it's an arithmetic one. One `EPSILON` constant fixes it, and the tests here can't use `assert.equal` on any coordinate for the same reason.

---

## Step 14 · Pie and Bars

1. A segmented pill above the chart card switches Life Star / Pie / Bars. Same three areas, same range, three drawings — and no data code runs when you switch.
2. A donut is **one stroked circle per segment**, not six wedges. `fill: none`, a stroke as thick as the ring, `stroke-dasharray` to cut it into a dash and a gap, `stroke-dashoffset` to slide that around the rim. Thickness is one property and the hole comes free.
3. The donut is the one chart here that uses **share of the total**, because a ring *is* the total. The star and the bars both use share of the *maximum*, because they're about balance. Same numbers, different divisor, different claim.
4. The bars aren't SVG. A bar is a rectangle of a given width and HTML has always drawn those; reaching for a viewBox would mean giving up wrapping text and inheriting fonts to draw six boxes.
5. The switcher is a radio group, not three buttons — arrows move between segments, Tab leaves the control, and a reader says "Pie, 2 of 3".
6. All three charts wear the same pastels as the calendar stickers, and draw into one fixed-size card, so switching lenses changes the drawing and nothing else.

**Design consequence:** the two seams built in Steps 12 and 13 got their real test here, and neither moved. Three charts now read one memoized `tally` and none of them touches data code; the sort that ranks the bars lives in `Bars.tsx`, exactly where `AreaTable.tsx` put its own. That's the payoff for a decision that looked like over-thinking two steps ago — **"where does the sort live" is cheap to answer once and expensive to answer three times**, and the version where each chart sorts its own copy is the version where the star silently starts reordering its spokes.

**Second one, and it cost a resize:** the shared `viewBox` had to be re-budgeted, because a box that fits the star does *not* fit the donut. Six spokes starting at the top put the star's side labels at 30° off horizontal, pulled in by `cos(30°)`; six *slices* starting at the top put the donut's labels at the slice middles, and two of those land at exactly three and nine o'clock — 17 units further out, with a longer string attached. **A shared frame has to satisfy the worse of its tenants, and the worse one isn't always the one you designed it for.** The fix was partly a wider budget and partly stacking the percentage under the name instead of running it on after a `·`, which is cheaper than the 90 units of width the circle would then sit in the middle of. The reason they share a box at all is worth keeping: you flip between these two while looking at the same numbers, and a second box would resize the card and jump everything under it.

**Third one, and it started as a bug report:** Trends was painting areas at full strength while the calendar painted the same areas as tints, so one life area was two different reds depending on which tab you were on. The obvious move is to saturate the calendar, because pale things are hard to see; the call went the other way — everything goes pastel. What made that safe was measuring instead of guessing. Adjacent donut wedges at their worst came out at ΔE 10.5 and the palest bar against its track at ΔE 11.2, both readable, because **a tint needs area to be perceived, and a 26-unit ring and a full-width pill have area.** The 10px dots didn't: the table's swatch, the star's vertex dots and the sticker picker's dot all measured 1.19:1 against cream. Each got a hairline ring to give it an edge.

**Fourth, and it undid the third:** three rings is three symptoms. The cause was one ramp tuned for one job — these tints were mixed for a 26px sticker and were being asked to carry a 10px dot. Stephanie named the fix by naming a colour, `#e2a79c` for red-soft, and that turned out to be *the same recipe at a different number*: the tokens are `mix(hue, surface, 28%)` and her value is that mix at 48%. One number moved, all six hues followed, and all three rings came off. **A palette written as a recipe can be re-tuned; a palette written as six hex values can only be re-picked** — and the version where you hand-darken six swatches is the version where the seventh area, added later, doesn't match any of them.

The theme split is the part worth keeping. Mixing further from the surface means moving *toward the full hue*, which is brighter in a dark theme and darker in a light one — so the same step that buys contrast under dark text costs it under light text. Yellow binds first: at 48% a mark on a dark-theme sticker drops to 4.03:1, under the 4.5 the file had always held, so dark stops at 42%. **A token pair that has always moved together can still have one number that doesn't**, and the giveaway is when the two sides mean opposite things by "more".

The star's dots are the sharpest version of the whole detour. They had a *cream* ring to keep overlapping dots apart; the moment the fill went pale, that ring became a cream dot on a cream card, so it went hairline; once the ramp deepened it went back to cream. **A separator only works if it contrasts with both things it separates** — and half of "both things" kept changing underneath it.

**Fifth, and it's the same shape twice in one session:** none of the buttons had a hand cursor. Tailwind v3's Preflight set `cursor: pointer` on `button` and v4 dropped it, matching the browser's actual default — so every control on the page said "arrow" while looking like it said "click me". The interesting part isn't the fix, it's that the codebase had *already been fixing it*: twelve `cursor-pointer` classes across nine components, added one at a time, each one working. **A local fix that works is how a missing base rule stays missing** — nothing ever fails, so nothing ever points at the cause, and the count just goes up. One rule in `@layer base` replaced all twelve.

The selector list is worth copying, because "just style `button`" misses half of it. Radix renders a radio item and a dropdown trigger as real `<button>`s, so those come free — but a Select option is a `<div role="option">` and a menu item is a `<div role="menuitem">`, and a `<div>` has never had a cursor. `label[for]` is in because a label bound to a control is a click target too. And disabled has to be excluded three ways — native `disabled`, Radix's `data-disabled`, `aria-disabled` — because a hand cursor over a control that won't respond is a promise the page can't keep.

**Sixth, and it's a two-line diff with a rule inside it:** once the charts went pastel, `RAMP`'s saturated `fill` and `stroke` had no callers, and they got deleted rather than left sitting there. The rule the step ended on is "every chart wears the calendar's tint", and **a rule you can only keep by remembering it is not a rule.** With the classes gone, painting a chart in a saturated hue means adding one back — which is a diff big enough to notice. The verification has a matching shape: the usual check is that a class you need *reached* the compiled CSS, and this time the useful check was that the deleted ones *left* it. Tailwind only ships what it finds in the source text, so a class vanishing from the stylesheet is proof the last caller is gone.

**Seventh:** the same `viewBox` that makes a drawing resolution-independent is also what makes `vector-effect="non-scaling-stroke"` necessary — and the donut is where that stops being a blanket rule. Every hairline in the star carries it, because a hairline is meant to be one device pixel at any size. The donut's stroke carries the opposite requirement: it *is* the drawing, 26 units of ring, and pinning it would render a 26-pixel band regardless of the card's width. **Two strokes, one attribute, opposite answers — the question is whether the thickness is part of the picture or part of the furniture.**

---

## Step 15 · The readout panel

1. The page is two columns now: the chart card on the left, and on the right — sitting straight on the page ground, no card — a sentence, the table, and a strip of moods.
2. The sentence is **generated from the data**, not written once. "Romance & Adventure held the greatest share of your attention this month." Change the range and it changes.
3. It's a pure function in `lib/analytics.ts`, not JSX, so the awkward cases (a two-way tie, a four-way tie, a completely flat month) are `assert` lines instead of things you'd have to reproduce in a browser.
4. `moodTally` is a **second pass** over the same map `tally` walks, on purpose — one counts placements, of which a day has many, and the other counts days, of which each has one mood.
5. The mood strip shows all five, always, in the scale's order — never ranked, never filtered. A zero is one of the better things it can tell you.

**Design consequence:** the right column deliberately isn't a card, and that's the whole visual argument of the step. A card is a frame, and a frame says "this is a picture, take it as a unit" — which is exactly right for the chart and exactly wrong for reading matter. Two cards side by side would have made the page a pair of panels with no hierarchy, when the actual relationship is that **one side is the picture and the other side is what the picture says.** The grid needs `items-start` for the same reason: without it both columns stretch to the taller one, and the chart card — a fixed ratio by design — gets pulled out of shape by however long the table happens to be that month.

**Second one, and it's the point of the step:** a chart shows a shape and leaves the reading to you. This sentence does the reading. It's the accessibility answer too — all three charts are `aria-hidden`, so for a screen reader these two lines *are* the summary, and they arrive before the table rather than instead of it. **A generated sentence is the one part of a chart that survives being spoken.**

**Third, and it's the same tie that bit in Step 12:** the obvious way to find the biggest area is to sort and take the first one. That's how you name Exercise, quietly don't name Friends & Family, and ship a sentence that's wrong in a way nobody can see — both are on 11. So `leaders()` returns a *list*, and the sentence branches on its length: one name, two or three names and the word "tied", a count above that, and "spread evenly across every area" when every area is level. **Ties aren't an edge case in counted data, they're the normal result of small numbers** — and a function that breaks one before the caller sees it takes away the caller's ability to be honest about it.

Each of those branches exists because the honest sentence changes *shape*, not just its nouns. A list of five life areas inside a sentence is a list wearing a sentence's clothes, which is why four or more get counted instead of named. And a completely flat month is not a tie for the lead — calling it one would be technically true and useless.

**Fourth:** the plan for this step asked for "a dot + name + count" in the mood strip, and it got a face instead. Not a liberty — a coloured dot is the one thing this app has consistently refused to give a mood, and three separate files say so in their own comments. Six hues mean six life areas, *everywhere*, and this is the single page where moods and areas appear at once, so spending a hue on "good" is where that rule would break. **When a plan's wording collides with a rule the codebase has been keeping, the rule is usually the older decision** — and the fix is to say so in the file, not to quietly do something else.

**Fifth:** a range can hold moods and no marks. Somebody rates how a day felt and never places a sticker, and then the chart and the table have nothing to draw while the mood strip still does. The empty state covers the numbers, not the page, so `MoodStrip` is exported and rendered beside it. **An empty state that hides data you actually have is a bug wearing a design's clothes** — worth checking any time one component's emptiness gates another's.

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
| A radar chart comes out rotated a quarter turn | angle 0 points *east*, not north — subtract π/2 to start at the top | `lib/lifestar.ts` → `spokeAngle` |
| A chart is mirrored vertically, or sweeps anticlockwise | SVG's y grows **downward**, so positive angles go clockwise — the opposite of the maths convention | same |
| A label at the top of a chart hangs off to one side | `cos(-π/2)` is `6.12e-17`, not `0`, so `cos > 0` calls straight-up "the right-hand side" | same → `labelAnchor` |
| Left-hand chart labels run back across the chart | they need `text-anchor: end`; the anchor has to be computed from the angle, not written per item | same |
| An SVG shape ignores `text-*` and `bg-*` colours | SVG paints with `fill` and `stroke`; `color` and `background-color` do nothing to a `<circle>` | `lib/palette.ts` → `fill` |
| Hairlines in a chart look furred or uneven | the stroke scales with the `viewBox` and lands on half-pixels — pin it with `vector-effect="non-scaling-stroke"` | `LifeStar.tsx` |
| Chart labels are sliced off at the edge | the root `<svg>` clips at the `viewBox`, and SVG can't measure or reflow text — budget the room in advance | `lib/lifestar.ts` → `VIEW` |
| A polygon vanishes entirely instead of collapsing | one `NaN` in a `points` attribute drops the whole shape silently; `0/0` is the usual source | same → `normalize` |
| A chart's tests pass on coordinates that can't be exactly equal | trigonometry returns the nearest double — compare within a tolerance, don't round to suit the test | `lib/lifestar.test.ts` |
| A chart and a table of the same data are read out twice | shape doesn't survive being spoken; hide the chart and let the table be the text version | `LifeStar.tsx` → `aria-hidden` |
| A pie slice over 180° renders as its own complement | that's the `A` path's `large-arc-flag` — a single digit that silently inverts the drawing | `lib/charts.ts` → `donutArcs` |
| Every donut segment is the right size in the wrong place | `stroke-dashoffset` shifts the pattern *backwards*, so the offset has to be negative | same |
| A donut segment fills the whole chart | a stroked circle needs `fill: none` — otherwise you're painting the disc, not the outline | `Donut.tsx` |
| A donut starts at three o'clock | a stroke begins at angle 0; rotate the `<g>` by -90° rather than offsetting every segment | same |
| Chart labels come out lying on their sides | they were inside a rotated `<g>` — `rotate` turns glyphs too. Position text outside the transform | same |
| A donut adds up to more than it should | it's the one chart that must use share of the *total*; `normalize` divides by the max | `lib/charts.ts` → `normalize` |
| A `<tspan>` steps diagonally away from the line above | it continues from where the last one ended; give it `x` again, not just `dy` | `Donut.tsx` |
| Every label on one side of a chart hangs slightly low | `dominant-baseline` positions a *line*, not a block — a second line needs its own offset | `lib/charts.ts` → `stackOffset` |
| SVG text has no line-height | there is no line box; a `<tspan>` moves by exactly the `dy` you give it, so leading is a constant you pick | same → `LINE` |
| A chart's stroke renders the same width at every size | `non-scaling-stroke` is wrong when the stroke *is* the drawing — it's for furniture, not picture | `Donut.tsx` |
| A `-0` fails a test that expects `0` | `Object.is(-0, 0)` is false, and that's what `assert.strictEqual` compares with | `lib/charts.ts` → `donutArcs`, `stackOffset` |
| A tiny bar renders as a lopsided blob | `rounded-full` on a fill narrower than it is tall; give a nonzero bar a minimum width | `Bars.tsx` |
| A long name in a grid pushes everything else off the card | a grid column's default minimum is its content — `minmax(0, …)` is what lets it shrink | same |
| Tailwind can't produce the class you need for a data-driven width | it never sees the number; that's the case an inline `style` is actually for | same |
| Two components must look identical but can't share one | share the class string, not the component — different elements, one appearance | `lib/layout.ts` → `segment` |
| A shadcn preset fights every style you put on it | it was drawn for a different shape; build on the Radix primitive underneath instead | `ChartSwitcher.tsx` |
| Arrow keys move the wrong way in a row of radios | Radix defaults a radio group to vertical — `orientation` decides which keys work | same |
| The card resizes when you switch to one particular view | a shared `viewBox` only sizes the charts that *have* one; the HTML one needs the ratio stated | `ChartCard.tsx` |
| A pastel swatch is invisible but the same pastel reads fine as a bar | a tint needs area — the ramp was tuned for the big shape, not the 10px one | `app/globals.css` |
| You're about to add an outline to make a colour visible | check whether the colour itself can move first; an outline is a symptom fix, and you'll need one everywhere | same |
| Buttons show an arrow cursor, not a hand | Tailwind v4's Preflight dropped `cursor: pointer` on `button`; v3 set it for you | `app/globals.css` → `@layer base` |
| You've written the same one-off fix in more than three components | that's a missing base rule; the local fix working is why nobody found the cause | same |
| A Radix menu or select option still has no pointer after you style `button` | those render as `<div role="option">` / `role="menuitem"`, not buttons | same |
| A Tailwind class ships that nothing uses | the scanner reads source *text* — naming it in a comment is enough to generate it | same |
| Darkening a token improves contrast in one theme and ruins it in the other | "further from the surface" means *toward the hue*, which is brighter on one side and darker on the other | same → the two `-soft` blocks |
| You grep the compiled CSS for `--x: #hex` and find nothing | the output has no space after the colon; read the artefact before writing the matcher | `.next/static/chunks/*.css` |
| A ring meant to separate two shapes stops separating them | its contrast was against the *old* fill — a separator has to contrast with both sides | `LifeStar.tsx` → vertex dots |
| The same thing is two different colours on two pages | one page used the ramp's full end and the other its soft end; the hue mapping was never the problem | `lib/palette.ts` |
| You want to prove a style is really gone | check the class *left* the compiled CSS — Tailwind only ships what it still finds in source | `.next/static/chunks/*.css` |
| A summary sentence names one winner when two are tied | it sorted and took the first; return the tied list and let the caller say "tied" | `lib/analytics.ts` → `leaders` |
| `Math.max()` of an empty list matches nothing and looks fine | it's `-Infinity`, so the filter passes cleanly and returns `[]` by luck, not by logic | same |
| A range label reads wrong inside a sentence | "All time" is a control's label; a clause needs an adverbial — they're different strings | same → `rangePhrase` |
| Two columns in a grid stretch to the taller one and distort a chart | `items-start`; a fixed-ratio card can't survive being stretched to a table's height | `TrendsBoard.tsx` |
| An empty state hides data the page actually has | one component's emptiness gated another's — moods can exist with no marks | same → `MoodStrip` |
| A screen reader says a mood's name twice | the icon carries its own accessible name and the strip prints it again — hide one | `Readout.tsx` |
| A scale comes out ranked biggest-first | order *is* data when the values are a scale; only a ranking should be sorted | `lib/analytics.ts` → `MoodTally` |

---

## The floor

Below this line, trust it and look it up if it breaks:

OAuth's token exchange · JWT signatures · how cookies travel · Postgres query planning ·
React's reconciler · how Tailwind compiles · what Next does to your bundle

Not knowing what's under the floor is a choice, not a gap. Raise the floor when a
bug drags you under it, and not before.
