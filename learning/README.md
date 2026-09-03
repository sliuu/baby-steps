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

## Step 16 · Editing a sticker

> The pencil below was replaced two cards further down — the row itself opens the editor now. Everything else here still stands, and the pencil's reasoning is why the replacement works.

1. A pencil fades in on a tray row when you hover it, and is always there when you tab to it. It opens the same dialog the `+` opens, with the three fields filled in.
2. The row couldn't do this itself — it's already a drag handle *and* a highlight toggle. A third meaning on one element makes all three ambiguous.
3. `StickerFields` moved to its own file and takes the action as a **prop**, so there's no `mode` prop and no `if (editing)` anywhere inside it.
4. An update under RLS that matches nothing is **not an error** — you have to ask for the rows back to tell "saved" from "silently did nothing".
5. Change the life area and the preview circle changes colour before you save — and a different sentence appears warning that past marks move with it.

**Design consequence:** this is the first step that was inserted rather than planned, and the reason is worth keeping. Editing wasn't missing because it was hard; it was missing because with seeded data nobody cares what a sticker is called. It became urgent within an hour of the calendar holding real entries. **A feature's priority is set by the data, not by the feature list** — and the list was written before there was any data to have an opinion.

**Second one, and it's the reusability lesson done properly:** create and edit want the same form. The tempting move is a `mode: "new" | "edit"` prop, and it's tempting because it's one prop — but that one prop becomes a branch at every place the two differ: the title, the button, the pending label, which action to call, whether to warn about moving. Five branches in one component, and every future difference adds a sixth. Passing the *action* instead moves the difference to the caller, where it's already a difference. **A shared component should take the things that vary as values, not take a flag and re-derive them.** The check that it worked: `StickerFields` contains no conditional about which form it is.

The one apparent exception proves it. There *is* a condition in there — the "past marks move with it" line only shows when you've actually changed the area. But it's computed from the values (`initial.lifeAreaId !== "" && lifeAreaId !== initial.lifeAreaId`), and a new sticker starts with an empty area, so it can't fire during a create without anyone telling it which form it is. **A self-answering condition isn't a mode.**

**Third, and it's the one that would have shipped as a silent bug:** `update … where id = ?` on a row that isn't yours does not fail under row-level security. The policy doesn't reject the statement — it removes the row from what the statement can see, so Postgres updates zero rows and reports success. The dialog would have closed with a satisfied little animation and changed nothing. Adding `.select("id")` and checking the length is the whole fix. **RLS turns "forbidden" into "not there", and "not there" looks exactly like "done" unless you ask what you touched.** Worth remembering that an insert has no equivalent problem — it either writes a row or raises — so this is a hazard specific to update and delete.

**Fourth:** `useId()`. The error message's id was a module-level constant, which was correct when one dialog existed and could only ever exist once. Two components generate it now, and a duplicate `id` in a document means `aria-describedby` points at whichever one the browser found first — so a screen reader could read the wrong dialog's error. Nothing visible breaks, which is what makes it worth catching by rule rather than by testing. **A constant id is a bet that the component is a singleton, and the bet expires the moment someone copies the file.**

**Fifth, and it's two lines of Tailwind:** hiding the pencil until hover is `opacity-0` plus `group-hover:opacity-100`, and that version leaves an invisible tap target on every row of a touch screen, where hover never happens. Wrapping the *hiding* in `@media (hover: hover)` fixes it: devices that can hover get the reveal, devices that can't get a pencil that's simply always there. **A hover-reveal is a progressive enhancement, so the hiding is the part that needs the media query, not the showing.** The group also has to be named — `group/row` — because the tray nests groups and a bare `group-hover` binds to the nearest one, which would light every pencil in a life area at once.

**Sixth:** the compiler caught the id confusion again. The first version of `EditStickerForm` took an `ActivitySticker`, which is a *placement* — its `id` identifies a row on a particular day, and its `activityId` identifies the sticker. Editing writes to `activities`, so it needs `LibrarySticker`. That's the third appearance of the same mix-up in this codebase, after `lib/highlight.ts` and the deliberately-mismatched fixtures in the analytics tests. **Two types that both have an `id` and describe the same picture are the ones worth keeping separate**, and the payoff is that this one was a type error rather than a form that saved to the wrong row.

---

## Step 16, continued · Retiring a sticker

1. The edit dialog's footer grew an **Archive** button and a trash icon. Archive drops the sticker into a collapsed **Archived (n)** fold at the bottom of the rail, dimmed and undraggable, with a one-click restore.
2. An archived sticker's **past marks stay**, on the calendar and in the Trends totals. Retiring a habit doesn't rewrite the months you did it.
3. Which means the library query stopped filtering `archived` — and every list that draws stickers now has to say which kind it wants. Four lists, four different answers.
4. In the day modal the rule is `!archived || placed.has(id)`: you can't add a retired sticker to a day, but you can still take it off a day it's already on.
5. Delete is the only irreversible control in the app, and the only one that asks twice. The confirmation **replaces** the row it's in, so the destructive button isn't where the harmless one just was.

**Design consequence, and it's the whole step:** one product decision — "do past marks still count?" — determined every technical choice below it. The obvious implementation is `.eq("archived", false)` in the query, and it's one line, and it silently answers "no": `tally` reads an activity's life area from the library, so an activity that isn't in the library has no area, so its marks stop being counted. Archiving a sticker in September would have quietly redrawn April. **The cheap filter isn't a smaller version of the feature, it's a different feature** — and the way to tell is to ask what *else* reads the thing you're about to filter. Four things did.

The cost is real and worth stating: the flag now travels with the data and every consumer must decide. That's four decisions instead of one, written down in four places. It's the right trade because the decisions genuinely differ — the tray wants two sections, Trends wants all of them, the day modal wants a rule that depends on the day. **A filter in a query is a decision made once for callers who never see it. A flag on the data is a decision each caller has to make out loud.** Prefer the flag exactly when the callers disagree.

**Second, and it's a rule about affordances:** archive gets one click, delete gets two, and restore gets none. That ranking isn't politeness, it's proportional to what you can't take back. A confirmation on an undoable action is a dialog protecting you from something you can undo — it trains you to click through confirmations, which is precisely what makes the one real confirmation useless. **Spend friction where the damage is permanent, and nowhere else.**

And when you do spend it, spend it on the *layout*, not just the wording. The confirming state replaces "Archive · 🗑" with "Keep it · Delete forever", so the destructive button appears where a harmless one wasn't a moment ago and a pointer already in motion doesn't land on it. The warning sits above the fields rather than beside the buttons, because a sentence in a footer gap is as wide as the gap, and it names the thing and counts what goes with it: "Painting and its 12 marks". **A confirmation that could describe any object isn't a confirmation, it's a speed bump.**

**Third:** the archived row is a new component rather than `TrayRow` with a `disabled` prop, and the reasoning generalises. `TrayRow` *is* a `DraggableSticker` — dragging and highlighting aren't things it does, they're what it is — so `disabled` would have switched off its entire body from a flag. Writing out the five lines that remain (a face, a name, one button) costs less than the flag does. The payoff isn't tidiness: **there is now no code path that can drop an archived sticker on a day, because the thing that does the dropping was never rendered.** A capability you didn't render can't be reached by a bug. Compare a `disabled` attribute, which is a promise the component makes and can break.

**Fourth, the platform did the work again:** the fold is a native `<details>`/`<summary>`. It opens with no JavaScript, it's announced as a disclosure with no ARIA at all, and browser find-in-page will open it to reveal a match inside — that last one is not something a hand-rolled version gets, and nobody would think to implement it. What it can't do is animate. **Check what the element already does before deciding it's not enough**; the list is usually longer than the one feature you noticed missing.

**Fifth, a testing move worth stealing:** rather than adding an "archived stickers still count" test, the existing fixtures were changed so one sticker in each is archived — and every existing expectation left alone. Now the whole suite asserts it. **The strongest test of "X shouldn't change the answer" is to put X into the fixtures everything else already uses**, because a dedicated test can be deleted or skipped by someone who thinks it's redundant, and forty tests going red can't be.

---

## Step 16, continued · Swapping the row's two meanings

1. Clicking a tray row now **opens its editor**. An **eye** at the right edge lights up every day that sticker appears on.
2. That's the reverse of what Steps 11 and 16 built, and **the pencil disappeared** — one button per row instead of two.
3. Every row and every area heading gets the same eye, so the rule is airtight: **the body opens, the right edge highlights.**
4. The eye is a real toggle: stable name ("Show Gym's days"), `aria-pressed` for the state, eye-off icon while lit. It stays visible while it's on.
5. The screen-reader instructions **got shorter** — the sentence explaining the hidden keyboard shortcut had nothing left to explain.

**Design consequence, and it's the one to keep:** the highlight was a feature made entirely of its own result. Nothing on the row said it would light up the calendar; you found out by clicking and noticing. Editing, by contrast, is what a click on a named thing *already* means everywhere else. So the two were the wrong way round, and the fix is a rule: **the interaction that needs its own control is the one with no natural gesture, not the one with an obvious one.** Put differently — if you had to write a sentence teaching someone that a click does X, X is the thing that should have been a button.

The evidence is in the diff. Step 11 prepended a line to dnd-kit's screen-reader instructions: "To highlight every day this appears on, press Enter." It was a good sentence and it was a workaround — the highlight was pure colour, triggered by a key nothing announced, so prose was the only way anyone without sight could find it. Once the eye existed as a labelled toggle one Tab away, that line had nothing to teach and was deleted. **Prose explaining an interaction is usually a control that hasn't been built yet**, and the accessibility text is where you notice, because it's the only place the app is forced to say out loud what it expects you to already know.

**Second, and it's the surprise:** the swap looked like it would add a control and it removed one. The row was carrying two meanings and a pencil; giving the second meaning its own button freed the click, which left the pencil with nothing to do. Fifteen rows now hold one button where they held two, so **the rail is less crowded after adding a control than it was before.** Worth being suspicious of the intuition that "more affordances" and "more clutter" are the same axis — a control that absorbs an overloaded gesture can pay for itself.

**Third, on toggles specifically:** the tempting thing is to swap the label with the state — "Show Gym's days" becomes "Stop showing Gym's days". Don't, when you're also using `aria-pressed`. The state then gets announced twice, from the name and from the attribute, and nothing keeps the two pointing the same way; the classic bug is a button that reads "Stop showing, not pressed". **Name says what it does, `aria-pressed` says whether it's doing it** — and the icon swap (eye → eye-off) is the sighted half of exactly the same division. Pick one channel for the verb and one for the state.

**Fourth:** with no trigger of its own, the edit dialog stopped needing to exist fifteen times. It became one dialog owned by the tray, keyed on `editing: string | null` — an **id**, not the sticker object. That's the detail worth stealing: `refresh()` after a save hands down freshly-fetched groups, and a stored copy of the object would keep rendering the old name. Looking it up each render also makes delete self-closing, because the lookup simply stops finding anything. **Hold the identity, derive the value** — the same reason `highlight` is a `useMemo` over `selection` rather than a second piece of state.

**Fifth, and it's a small proof the seams were right:** `keyboardCodes` in `CalendarBoard` needed no change. Step 11 dropped `Enter` from dnd-kit's drag-start keys so the row's own click could fire; that click used to mean highlight and now means edit, and the sensor config never knew the difference. **When a change of meaning touches only the component that holds the meaning, the boundary was in the right place** — and the opposite is the usual warning sign: if swapping what a click does had required editing the drag sensor, the two were tangled.

---

## Step 16, continued · Dropping outside, and a `+` per area

1. Dragging a sticker off the calendar used to drop it on the nearest border square. Now it lands nowhere — and **says so**: the card goes translucent and dashed, with "Let go to cancel" under it.
2. The cause was a **fallback**, not a missing check. `pointerWithin` with `closestCenter` behind it — and `pointerWithin` returns empty both when there's no pointer *and* when the pointer is over nothing.
3. Each life area heading now has a **`+`** beside its eye, opening the create dialog with that area already chosen.
4. That pre-filled area broke a condition elsewhere that was inferring "this is an edit" from "an area is already chosen".
5. One round of `tsc`/`eslint` passed from **the wrong directory** and proved nothing. `cd` in a shell command persists.

**Design consequence, and it's the general lesson:** the collision fallback read as "use the pointer, and cover the keyboard case too". What it actually said was "use the pointer, and if the pointer finds nothing, guess". Those two sentences agree in every case anyone tested, because the case that separates them — a mouse user deliberately releasing over empty space — was the one nobody thought of as a case. **A fallback keyed on "the first strategy returned nothing" is answering a different question from "the first strategy doesn't apply here"**, and the fix was to test the condition that actually distinguishes them: is there a pointer at all. `pointerCoordinates` is null for keyboard drags and nothing else, which was read out of `@dnd-kit/utilities` rather than assumed — `getEventCoordinates` returns null for any event without `clientX`/`clientY`.

The tell, in hindsight, was that `handleDragEnd` already had a branch for "released over nothing" with a comment explaining it, and that branch was unreachable with a mouse. **Dead code that describes a behaviour the app doesn't have is evidence about the layer above it**, not something to delete.

**Second, and it's the half that makes it a feature instead of a fix:** making the drop a no-op is correctness. On its own it's a dead zone, and a dead zone and a bug feel identical from the outside — you let go, nothing happens, and you can't tell whether the app refused or failed. So the overlay changes: translucent, no shadow, dashed border — the vocabulary a placeholder uses — plus four words. **An action that intentionally does nothing has to say it's doing nothing on purpose**, or the design is indistinguishable from the bug it replaced.

The cue is positioned *absolutely* under the card rather than added inside it, and that's not fussiness. The overlay is `w-fit` and it sits under your cursor; adding words inline would widen it, so it would jump sideways at the exact instant you crossed the grid's edge — the moment it most needs to hold still. **When an element tracks the cursor, state changes may repaint it but must not resize it.**

**Third:** the `+` per life area is the same component as the header's, with one prop. What it exposed is more interesting than what it added. `StickerFields` decides whether to warn "past marks move with it" by testing `initial.lifeAreaId !== ""` — documented, in a comment I'd written approvingly, as *self-answering*: only an edit arrives with an area already chosen, so no `mode` prop was needed. A create that opens pre-filled is exactly the case that inference ruled out, and a brand-new sticker would have warned you about past marks it cannot have.

The replacement is `historyArea` — the area whose existing marks would move — which only the edit dialog passes. Still not a mode flag: it's a value, and it names the thing the sentence is actually about, where the old test was a proxy that happened to agree. **A self-answering condition is an inference wearing a fact's clothes, and it holds only until someone adds the case it inferred from.** Worth grepping for the phrase "can never happen" in your own comments; it dates them.

**Fourth, a process one, and it cost real time:** `cd` inside a Bash tool call persists into the next call. A full `tsc && eslint && test && build` ran from inside `node_modules/@dnd-kit/core/dist` and reported success having examined nothing — eslint's "all files matching '.' are ignored" looked exactly like a known flake from the dev server. **A green check from the wrong directory is worse than a red one**, because a red check gets investigated. If a check suddenly passes trivially or fails in a way unrelated to your change, verify *where* it ran before you interpret *what* it said.

---

## Step 16, continued · Four subtractions and an outline

1. A sticker is now a **pale circle with a 1px outline** in its area's colour, instead of a filled pastel one. Emoji are legible on it.
2. The book emoji sat low because a line box takes its metrics from the **first available font**, not the font that draws the character.
3. "Let go to cancel" is gone from the drag overlay. The dashed, translucent card says it faster.
4. "4 marks in all, across 2 of your 6 areas" is gone from Trends — it sat directly above a table of the same numbers.
5. The five moods moved to the **top** of the tray.

**The outline first, because it's the one addition.** The fill was the soft rung of the ramp — 48% of the hue over the surface — and a mark drawn in `--ink` always read on it. The marks that didn't are the ones this app can't recolour: an emoji arrives with its own palette, and a mid-tone circle behind it competes with every one of them at once. Moving the hue onto a ring and dropping the fill to 20% hands the middle of the circle back to whatever is drawn there, and the area is arguably *more* identifiable than before, because a ring is the full colour rather than a tint of it. The old constraint still holds — five saturated circles on one day would shout over the date — but a 1px shape is thin enough to wear a full hue without doing that. **A fill and the thing drawn on it are competing for the same pixels; an outline isn't.**

The new rung is a **solid token**, not `bg-ramp-red-soft/40`. A sticker sits on the surface in the tray and on a sunken cell in the grid, and a translucent fill mixes with whatever is behind it — the same colour would arrive as two colours. It's also the rung where the light and dark themes could finally use the *same* number: the `-soft` pair are 48% and 42% because mixing *toward* the hue is brighter on one side and darker on the other, so a step that helped `--ink` in one theme hurt it in the other. Mixing *less* moves each toward its own surface, which adds contrast in both directions at once. Floor is 8.5:1.

**The emoji, and this is the reusable one.** CSS sizes a line box from the **first available font** — the first family in the stack the browser has installed, whether or not it contains the character being rendered. The mark was set in the body serif, so the box height and the baseline came from EB Garamond's ascent and descent, while the emoji's ink was drawn by the emoji font against its own. The two disagree, and the glyph sits low in a circle that is itself perfectly centred. Naming the emoji font first makes the box and the ink come from the same metrics. **`place-items-center` centres a box; it has no opinion about where the ink is inside it.** Same lesson as the `+` in `NewStickerForm` arriving from the other side — there the fix was to stop using a glyph, here it's to let the glyph's own font size the box.

**Then three subtractions, all of the same kind.** Each was text explaining something the interface was already showing:

- The cancel line was written a day earlier, in this file, as the thing that turns a dead zone into a way out. It isn't — the dashed translucent card is. Words have to be *parsed*, and you read this one with your hand already in motion.
- The Trends support line gave totals directly above a table of the same totals, laid out so you can read any number without holding one in your head.
- (The third of the kind, from last week: the screen-reader instruction that taught the highlight key, deleted once the eye existed.)

**The pattern is worth naming both ways round.** "Prose that explains an interaction is usually a control that hasn't been built yet" — and once the control exists, **the prose doesn't retire itself.** It reads as harmless, it was correct when written, and nothing fails when it stays. It goes when someone looks at the screen and asks what each line is *for*.

The cancel sentence does survive in one place: the drag announcement, where there is no dashed border to see. **Removing a visual cue's caption isn't the same as removing the information** — the two channels only had to say the same thing while both were the only way in.

**Moods to the top** is one JSX block moving above a `.map`, and the reason is worth a line: the ordering was "the things you own, then the things that come with the app". The one that matches filling in a day is "how it felt, then what you did" — the mood is the row you always have something to say about, and being fixed by a CHECK constraint is what makes it a good first group rather than a leftover. It's the one list in the tray that never changes shape.

---

## Step 16, continued · The cell stops being a button

1. A day cell is a plain `<div>` again. Clicking one no longer opens anything.
2. Every mark on the calendar is **draggable**: pick it up, drop it on another day to move it.
3. Drop it outside the calendar and it comes off that day.
4. A small **pencil** appears in the bottom-right corner on hover. That's the way into the modal now.
5. Same gesture, two meanings — releasing over empty space cancels a tray drag and deletes a placed one.

**One control per gesture, and the cell was holding three.** The whole square was a button, so a press anywhere in it meant "open this day". That is fine right up until the things *inside* the square want to be pressed too — and a mark you can pick up and carry is exactly that. HTML says so directly: a `<button>` may not contain another control, so for as long as the cell was one, every sticker in it could only be a picture. **When a container becomes a control, it spends the interaction budget of everything inside it.** Shrinking the button down to a 24px pencil gave the rest of the cell back.

The pencil is **revealed on hover**, and the reveal is behind `@media (hover: hover)` — a rule this project has now needed twice. A touch screen never fires hover, so `opacity-0` lifted only by `:hover` is a target you cannot see and can still hit. On a phone, all 42 pencils are simply visible.

**What the old cell had that nothing else did was the `aria-label`.** It read "20 August. Gym, Meditation. feeling Great" — one long sentence, because a control whose contents are drawings has to name itself somehow. With the cell no longer a control, each thing in it names itself: the `<time>` is a date, each mark is a button labelled "Gym, 20 August", the pencil says "Edit 20 August". The sentence had nothing left to describe — except the highlight, which is **made entirely of tint**, and so moved into an `sr-only` line. **A feature made of colour does not exist for someone reading the page rather than looking at it**; deleting the label that carried it would have deleted the feature for them. Same lesson `dayLabel()` was written to teach, outliving the function.

**A move is one `UPDATE`, not a delete and an insert.** The row exists and only its `day` is wrong. Two statements would be two round trips that can half-fail, and — the part you can see — a new row id, so React would unmount one circle and mount another in the frame the drop is meant to feel continuous. Updating keeps the id, so the same element moves. The optimistic reducer copies that exactly: it carries the existing sticker object across rather than minting a `pending:` one.

Two failures worth naming because neither looks like one:

- **`UPDATE` is the statement RLS filters rather than rejects.** A row that isn't yours is simply not in scope, so Postgres updates nothing and reports success. `.select("id")` and a length check is the only tell — the same trap `updateActivity` documents.
- **`23505`, the unique violation**, is a thing you can do by hand: drag Monday's Gym onto a Tuesday that already has Gym. There's nowhere for the row to land, and the honest outcome is a *merge* — the mark leaves Monday, Tuesday keeps the one it had. So the conflict falls through to deleting the source row, which is what the optimistic redraw had already shown.

**The awkward part, and it stayed awkward.** Releasing over empty space now means two different things depending on where the drag *started* — cancel from the tray, delete from a day. That's a real ambiguity, not a solved one. The overlay distinguishes them by paint only: same box, same dashed border, same opacity, red instead of grey. **Nothing about the card's geometry may change mid-drag**, because it's under a cursor that is currently aiming. The screen-reader announcement splits the same way, and it's the one place words are still the right answer — "let go to cancel" said over a deletion would be a lie told at the exact moment it can't be checked.

**A draggable has to be focusable.** `useDraggable` hands back a `tabIndex`, a `role`, and keyboard listeners, and all three do nothing on a `<span>`. So each mark is a `<button>` — which costs one tab stop per mark, the honest price of the marks being things you can pick up. Its `id` is the **placement** row, not the activity: two days holding Gym are two draggables, and the same id twice in one `DndContext` is a collision.

**And clicking a mark does nothing at all**, deliberately. Its whole body is a drag handle. A thing you can grab *and* press is a thing where you can't tell by looking which of the two a press will do.

---

## Step 16, continued · Counting a thing's verbs

1. The moods are **one row of five columns** in the tray — face on top, word underneath — instead of five full-width rows.
2. Clicking a mood in the tray now **lights it**. The eye beside it is gone.
3. Clicking a mood **on the calendar** opens a small panel: five faces and "Clear mood". Nothing else.
4. `TrayGroup` lost an optional prop, because the moods were the only thing that omitted it.

**The rule that decided all of this: count the verbs.** A sticker row has three — drag it, edit it, highlight it — and three meanings can't live on two elements, so the third gets its own control. That's the eye, and it's why Step 16 swapped the row's click from "highlight" to "edit". A mood has **two**: drag it, highlight it. There is nothing behind a mood to open; it's fixed by a CHECK constraint, so no row in any table exists to edit. Which meant its body's click did *nothing at all* — a focusable button with an empty `onClick`, sitting next to an eye doing the job the body could have done. Giving the click back to the highlight removed a control rather than adding one, and removing it is what left room for five columns.

**And the layout change is what surfaced it.** Five columns at 54px cannot hold a 24px eye under each face. A width constraint forced a question about meaning — which is common enough to expect: **when a layout won't fit, check whether the thing that won't fit is earning its place.**

**Fixed columns, not `flex-wrap`.** Wrapping looks like the accommodating choice and isn't: at the first width that doesn't fit it breaks 4 + 1, and a lone "Rough" on its own line reads as a *different kind of thing* rather than the fifth of five. Equal columns just get narrower, and the labels truncate long after that stops mattering — the longest is five characters.

**A popover is not a small dialog.** They're different in the one way that decides between them: a dialog takes the screen, traps focus, and dims what's behind it — right for "edit this day", far too much for "actually it was okay". A popover is anchored to the thing it's about and leaves the month visible while you choose, so you can see the days either side. **Match the weight of the surface to the size of the edit**, not to how easy the component is to reach for.

The mood popover **only exists where a mood already does**, which follows from hanging the trigger on the face: an empty day has no face to click, so adding a day's *first* mood is still the pencil's job. The alternative — 42 permanent empty circles — would have made the days with nothing recorded look like the ones left unfinished. **A calendar's default state is empty, and a placeholder in every cell turns "nothing happened" into "something is missing."**

**One prop stopped being optional, and that's a real cleanup.** `TrayGroup.onSelect` was `?` for exactly one caller — the mood group, which had no eye — and the component carried a second heading branch for it. Once the moods left, that branch was unreachable. **An optional prop that nothing omits is a code path you cannot check by using the app**, and it drags a doc comment describing a caller that no longer exists.

**On the emoji, one more time.** It still sits slightly high, and the reason is the *unfinished half* of the earlier lesson. Centring a line box centres the font's **ascent + descent box**. Apple Color Emoji reserves descent room its glyphs barely use, so that box's midpoint sits below the ink's midpoint and the glyph rides up. Naming the emoji font first fixed *which* box we inherit — the gross error, box from one font and ink from another. It cannot fix that a metrics box is not ink. **There is no `align-items: optical`**; the last pixel is a `translate-y` chosen by eye, and it's font-specific, so a value tuned for 📖 will be slightly wrong for `✎`. It's `translate-y-[0.5px]` now — and it works only because the glyph span is a **grid item**: `translate` has no effect on a non-replaced inline element, but a direct child of a `grid` container is blockified, so it takes one.

**One more, from the same round: a page margin is two numbers, and they bind at different widths.** `max-w-*` is what stops the content on a wide monitor, and the gutter is whatever's left; on a laptop the max-width never comes into play and `px-*` is the entire margin. **Changing only one of them widens the page in half the windows it's viewed in.** Both live in a single exported string, because the nav and the page body have to agree on it — the wordmark sits directly above the calendar's left edge, and that misalignment is the kind you see instantly and then hunt for.

---

## Step 16, continued · Two columns that start and end together

1. On Trends, the range dropdown and the Star/Pie/Bars pill **moved into the left column**. The full-width header band is gone.
2. The sentence — "Exercise was the greatest share…" — now starts level with the dropdown instead of a control row below it.
3. The mood heading reads **"Moods this month"**.
4. The right column lost about 50px of internal spacing so the two columns finish at roughly the same line.

**The header band was costing the right column a row it got nothing for.** A full-width strip holding a dropdown and two dates is a strip whose right half is empty. Everything under it starts below it — including the sentence, which is the page's actual answer. So the answer began lower than the furniture that filters it. **A full-width control row taxes every column, and it only earns that from the columns it visibly serves.** Here it serves one: the chart is what you're switching lenses on, and the sentence and the table just re-read whatever the range resolved to.

**The cost is real and worth stating.** The range picker governs both columns and now sits inside one of them, which reads faintly like it only filters the chart. What keeps that from misleading is that there is nothing on this page it *doesn't* filter — one range, one set of numbers, stated twice. If a control ever filtered only half the page, this arrangement would be a lie and the band would have to come back.

**Two columns of unequal length is not a bug to fix, it's a length to choose.** The chart card is a fixed aspect ratio: its height comes from the column's width, so it cannot be stretched to meet the readout. The readout is a sentence, a table and a strip — all of it stretchy. Only one side of a mismatch like this can move, so the question is never "make them equal", it's **"which side is the one that can give?"**

**And you take it from the largest multiplier.** Three places gave up space and they're worth ranking, because the arithmetic is the whole lesson:

| Change | Per instance | Instances | Total |
|---|---|---|---|
| Table row padding, `py-2.5` → `py-2` | 4px | 8 rows | ~32px |
| Column gaps, `gap-8` → `gap-6` | 8px | 2 gaps | 16px |
| Mood strip heading gap, `gap-4` → `gap-3` | 4px | 1 gap | 4px |

The change nobody notices — 2px off the top and bottom of a table row — moved twice what the change you'd reach for first did. **In a stack, look for what repeats before you look for what's biggest.**

**One horizontal change bought vertical space.** The mood strip's `gap-x-6` became `gap-x-5`: four gaps, 16px of width, which is roughly what the five items needed to stop wrapping. When a wrapping row fits on one line it is a whole line shorter. **A too-narrow row pays for itself in height, and the fix can be on the other axis.**

**"Mood this month" was the wrong number.** Singular reads as a label for one value — *the* month's mood — which is exactly what the strip isn't: it's five counts, and the zeros are part of the answer ("no rough days" is a measurement). The `phrase` in the heading is the same string the sentence above it uses, computed once in `TrendsBoard`, so the two can't drift into describing one fortnight two different ways. **When one fact appears in two sentences, pass the fact, not the wording.**

**`items-start` is the line that keeps this honest.** A grid stretches its items to the tallest row by default, which would pull the fixed-ratio chart card out of shape by however long the table happens to be that month. The whole exercise above is about matching the two columns' *ends*; `items-start` is what guarantees the mismatch shows up as whitespace instead of as a distorted picture.

---

## Step 16, continued · One pixel, and a slot for the pencil

1. A day cell now fits **three marks to a row** instead of two, and holds **5 before it grows** instead of 2.
2. The date and the mood keep a **header line to themselves**, with a gap under it.
3. The pencil **takes a mark's slot** at the end of the run instead of hovering over the corner.

**A one-pixel arithmetic failure looked like a design decision.** The cell's inner width is about 85px: 744px of calendar over seven columns, less the padding. Three 26px marks with `gap-1` between them is 26×3 + 4×2 = **86px**. One pixel over, so the row silently broke at two and the right-hand column of every single cell in the month sat empty all month. It reads as a deliberate two-up layout. It's a rounding loss. **When a wrapping row settles on a number you didn't choose, do the addition before you redesign anything.**

The fix is 2px gaps, and the honest note is that it leaves ~3px of slack. **A layout that fits by three pixels will un-fit silently** when the rail, the page width, or the mark size next changes — nothing errors, a column just disappears.

**Vertical margins on inline boxes do nothing.** With the marks in inline flow, `mb-1` between wrapped rows is ignored: margin on an inline-level box doesn't grow the line box around it. The space between rows of wrapped inline content comes from **`line-height` and nowhere else** — here `leading-[30px]`, 26px of mark plus 4px of air, matching the horizontal rhythm on purpose.

**Floats can wrap content around a corner, and that was still the wrong thing to build.** The marks briefly did exactly that: the date floated left, the mood floated right, and marks filled what was left of the first line. It's the one layout mode that can do it — flexbox has no way to express "flow past a pinned item", `ml-auto` gets you the pinned item and nothing more. It worked, it bought one mark of capacity, and it was backed out on sight. **The top line is a header** — *this is the 20th, and the day felt like this* — and a sticker landing between those two turns a label into a shelf. **"Can this space be used" and "should this space be used" are different questions, and only the second one is about the design.** The capacity came from the one-pixel fix anyway; the floats were the smaller half.

**A control that overlaps content should usually take a slot instead.** The pencil was absolutely positioned in the corner, which meant reserving a strip of padding so marks wouldn't run under it, then giving it an opaque chip for the busy days where they did anyway, then accepting that hovering a full cell covered a mark you could no longer pick up. Three accommodations for one overlap. Putting it in the flow as the last item in the run deletes all three: it can't collide with something it's queued behind. **When a fix needs a second fix to cover its edge, check whether the thing can just stop overlapping.**

It stays `opacity-0` rather than `hidden`, because **the slot has to be held whether or not it's showing** — a control that appears and reflows the row it's in is worse than one that was simply always there.

**And a class name inside a comment still ships.** Explaining in a code comment that a zero-size text utility hadn't worked put the literal class name back in a file Tailwind scans, and Tailwind scans **source text** — it has no idea what a comment is. The dead rule reappeared in the bundle. Same lesson as the palette one from Step 1, from a direction nobody expects: **if a class name appears anywhere in a scanned file, it is compiled.**

(The utility was a `text-*` bracket holding a bare `0`, and it compiled to `color: 0` — Tailwind reads an unsuffixed `0` there as a colour, not a length. It was unnecessary anyway: a 30px line-height already makes the strut 30px tall. The exact class name is *not* spelled out in this paragraph on purpose, because **this file is scanned too** — writing it here put the dead rule straight back into the bundle, which is the lesson demonstrating itself.)

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
| A screen reader reads a cell as "20 Gym Meditation Great" | the container became a control, so its children's names got concatenated into its own | `DayCell.tsx` (the cell stopped being one in Step 16) |
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
| An update "succeeds" under RLS but changes nothing | the policy hid the row rather than rejecting the statement — zero rows updated is not an error | `app/actions/activities.ts` → `updateActivity` |
| A form component fills up with `if (editing)` branches | it took a mode flag; pass the things that vary — the action, the labels — as values instead | `StickerFields.tsx` |
| A screen reader reads the wrong dialog's error message | two instances share a hard-coded `id`; `useId()` per mount | same |
| A hover-reveal leaves an invisible tap target on a phone | hover never fires there — put the *hiding* behind `@media (hover: hover)` | `EditStickerForm.tsx` |
| A hover on one row lights up every row in the section | `group-hover` binds to the nearest group, and the tray nests them — name it `group/row` | `TrayGroup.tsx` |
| A row can't take another click meaning | it's already a drag handle and a toggle; the third control has to be its own element | same |
| An edit form saves to the wrong row | it was handed a placement, not the library sticker — their `id`s mean different things | `EditStickerForm.tsx` |
| A summary sentence names one winner when two are tied | it sorted and took the first; return the tied list and let the caller say "tied" | `lib/analytics.ts` → `leaders` |
| `Math.max()` of an empty list matches nothing and looks fine | it's `-Infinity`, so the filter passes cleanly and returns `[]` by luck, not by logic | same |
| A range label reads wrong inside a sentence | "All time" is a control's label; a clause needs an adverbial — they're different strings | same → `rangePhrase` |
| Two columns in a grid stretch to the taller one and distort a chart | `items-start`; a fixed-ratio card can't survive being stretched to a table's height | `TrendsBoard.tsx` |
| An empty state hides data the page actually has | one component's emptiness gated another's — moods can exist with no marks | same → `MoodStrip` |
| A screen reader says a mood's name twice | the icon carries its own accessible name and the strip prints it again — hide one | `Readout.tsx` |
| A scale comes out ranked biggest-first | order *is* data when the values are a scale; only a ranking should be sorted | `lib/analytics.ts` → `MoodTally` |
| Hiding a row from one list quietly changes a total on another page | the filter was in the shared query; put a flag on the data and let each caller decide | `lib/queries/activities.ts` → `getStickerLibrary` |
| A mark sits on the calendar with no control anywhere that can remove it | the only checkbox that could take it off was filtered out of the list | `DayModal.tsx` → `visible` |
| A `disabled` prop switches off most of a component's body | the thing being disabled *is* the component — write the smaller one instead | `TrayGroup.tsx` → `ArchivedRow` |
| A confirmation is easy to click straight through | the dangerous button appeared where a safe one just was; replace the row, don't add to it | `StickerRetire.tsx` |
| A boolean is needed in two places that aren't parent and child | it belongs to the nearest component containing both — same lift as any shared state | `EditStickerForm.tsx` → `confirming` |
| A disclosure needs JS, ARIA, and still loses find-in-page | `<details>`/`<summary>` does all three; the only thing it can't do is animate | `StickerTray.tsx` → `ArchivedGroup` |
| You're writing a sentence to teach someone what a click does | that sentence is a control you haven't built; the a11y text is where it shows first | `CalendarBoard.tsx` → `screenReaderInstructions` |
| A toggle reads "Stop showing, not pressed" | the label changes *and* `aria-pressed` is set — pick one channel for the state | `HighlightToggle.tsx` |
| A dialog reopens with a stale name after a save | state stored the object; hold the id and look it up, so `refresh()` reaches it | `StickerTray.tsx` → `editing` |
| An element accumulates a third click meaning | two can share a body when a threshold separates them; the third needs its own element | `TrayGroup.tsx` → `TrayRow` |
| Voice control can't click a row whose label you extended | the accessible name must still *contain* the visible text — "Edit Gym" does, "Open editor" doesn't | `DraggableSticker.tsx` → `label` |
| A drop outside the target area lands on its nearest edge anyway | the collision fallback fires on "found nothing" as well as on "doesn't apply" | `CalendarBoard.tsx` → `collisionDetection` |
| A branch has a careful comment and is unreachable | that's evidence about the layer above it, not dead code to delete | same → `handleDragEnd` |
| An element that follows the cursor jumps sideways when its state changes | the state added content to a `w-fit` box; position the extra absolutely instead | same → the `DragOverlay` cue |
| A `useState` flag is stale on the second drag | `onDragOver` fires on *changes*, so a drag that never enters a target never fires it | same → `overDay` |
| A condition described as "can never happen during a create" happens | it was inferring the mode from a value; take the fact as a prop instead | `StickerFields.tsx` → `historyArea` |
| A check passes suddenly and trivially | `cd` persists between shell calls — confirm where it ran before trusting what it said | — |
| An emoji sits low in a circle that is itself perfectly centred | a line box takes its metrics from the *first available* font, not the one that draws the glyph | `StickerMark.tsx` → `font-emoji` |
| A coloured fill competes with whatever is drawn on top of it | move the hue to a 1px outline — a ring can wear the full colour without shouting | same |
| The same tint arrives as two colours on two surfaces | it was `bg-*/40`, so it mixed with whatever was behind it; a solid token is one value everywhere | `app/globals.css` → the `-tint` rung |
| A caption explains a state the visual already states | it was written before the visual existed, and prose doesn't retire itself when the control lands | `CalendarBoard.tsx` → `DragOverlay` |
| A summary line gives totals directly above a table of the same totals | one of them makes you hold a number in your head; keep the one that says what the other can't | `lib/analytics.ts` → `takeaway` |
| Something inside a clickable area can't be made clickable | a `<button>` may not contain another control; shrink the container's hit area to a real button | `DayCell.tsx` → the pencil |
| A feature made entirely of colour disappears when you delete a label | the label was the only place it was ever said; move it to `sr-only`, don't drop it | same → the highlight line |
| An `UPDATE` reports success and nothing changed | RLS *filters* update scope rather than rejecting it; `.select("id")` and check the length | `app/actions/stickers.ts` → `moveActivity` |
| Moving a row makes the element flicker or lose its place | it was written as delete + insert, so the id changed and React remounted it | same |
| `useDraggable` gives an element keyboard props that do nothing | a `tabIndex` and key listeners need a focusable element — make it a `<button>` | `DraggableMark.tsx` |
| Two draggables collide in one `DndContext` | the id was the *thing*, not the *placement*; two days holding Gym are two draggables | same |
| One gesture means two things depending on where it began | that's a real ambiguity — distinguish it in paint and in the announcement, not by hoping | `CalendarBoard.tsx` → `leaving` |
| An emoji is *still* off-centre after the font stack is fixed | centring centres the ascent/descent box; emoji reserve descent their ink doesn't use. No CSS centres ink | `StickerMark.tsx` |
| A control has a click handler that does nothing | count its verbs — two can share a body, so the separate control for the second one is spare | `MoodPicker.tsx` |
| A layout won't fit in the width it has | check whether the thing that won't fit is earning its place before shrinking everything | same |
| `flex-wrap` breaks a set of five into 4 + 1 | the orphan reads as a different kind of thing; fixed equal columns just get narrower | same → `grid-cols-5` |
| An optional prop that no caller omits | its branch can't be reached by using the app, and its doc describes a caller that left | `TrayGroup.tsx` → `onSelect` |
| A one-field edit opens a full-screen dialog | match the surface's weight to the edit's size — a popover keeps the context visible | `DayMoodButton.tsx` |
| Empty cells look unfinished rather than empty | a placeholder in every cell turns "nothing happened" into "something is missing" | same |
| A page margin changes on one screen size and not another | `max-w-*` binds on wide screens, `px-*` on narrow — a margin is both numbers | `lib/layout.ts` → `PAGE_WIDTH` |
| `translate-*` does nothing on a `<span>` | transforms skip non-replaced inline elements; a flex/grid child is blockified and works | `StickerMark.tsx` |
| One column starts a whole row lower than the other | a full-width control band pushes every column down, and half of it is empty | `TrendsBoard.tsx` → the header that left |
| Two columns end at wildly different heights | only one of them can give — a fixed-ratio card takes its height from its width | `Readout.tsx` → `gap-6` |
| Trimming the obvious gap barely moves the column | look for what repeats: 2px off eight table rows beat 8px off two gaps | `AreaTable.tsx` → `py-2` |
| A grid stretches a fixed-ratio card out of shape | grid items stretch to the tallest in the row by default; `items-start` opts out | `TrendsBoard.tsx` → `<section>` |
| A wrapping row is one line taller than it needs to be | narrowing the *horizontal* gap is what buys the height back | `Readout.tsx` → `gap-x-5` |
| A heading names one value when it summarises five | singular reads as a label; the zeros in the set are part of the answer | `Readout.tsx` → `MoodStrip` |
| A wrapping row settles on one item fewer than expected | do the addition — 26×3 + 4×2 is 86px in an 85px cell | `DayCell.tsx` → `mr-0.5` |
| `mb-*` between wrapped rows of inline-blocks does nothing | vertical margin doesn't grow a line box; row spacing is `line-height` | same → `leading-[30px]` |
| Content can't wrap around a pinned corner element | flexbox can't express it and floats can — then ask whether it *should* | same, and the version that got backed out |
| An absolute control needs padding, then a chip, then an excuse | three fixes for one overlap; put it in the flow and it can't overlap | same → the pencil |
| A control appearing on hover makes the row jump | `hidden` gives the space back; `opacity-0` holds the slot | same |
| A class you deleted is still in the compiled CSS | you wrote its name in a comment — or in a doc. Tailwind scans text, `.md` included | same, and this file |
| A `text-*` bracket holding a bare `0` sets no font size | an unsuffixed `0` there is read as a colour, so it emits `color: 0` | compiled CSS, not your code |

---

## The floor

Below this line, trust it and look it up if it breaks:

OAuth's token exchange · JWT signatures · how cookies travel · Postgres query planning ·
React's reconciler · how Tailwind compiles · what Next does to your bundle

Not knowing what's under the floor is a choice, not a gap. Raise the floor when a
bug drags you under it, and not before.
