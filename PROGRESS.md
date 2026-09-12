# Progress

Newest first. One entry per step.

**Now:** There is a demo at **`/demo`**, linked from under the sign-in buttons: the whole app, no account, a year of stickers generated from today by `lib/demo.ts` — four a day, spread across the six areas, 86% of days with a mood, and a habit that visibly stopped. The boards are the real ones; `local` on `CalendarBoard` turns off the network and nothing else. Before that: Trends was re-cut and then split into three tabs — **Areas · Habits · Moods**. No pie, no chart switcher. *Habits* pairs a ranking of your most-done with a strip of every habit's last eight weeks, a square per day, side by side on a wide screen and stacked at one width on a narrow one. *Moods* opens with a line joining every day you logged, in ink, with the reading printed above it in words. Never yet seen in a browser. Before that: the calendar grew two views. A Month/Week pill sits beside the title and the same two arrows step whichever one you're in; the week is seven tall columns, each with the day's stickers spelled out as named bars and a note field at the bottom for a line about that day. Before that: every emoji in the app became a Lucide icon, drawn from a 432-icon map with eight hand-drawn sports additions, and the body text moved to DM Sans throughout. **All of it committed and pushed** — four commits on `main`, which is what the hosted version had been missing: the database already held `icon:<id>` marks for all 23 activities and the deployed build was still `c77303b`, so every sticker there read as the literal words `icon:tennis`. `npm run db:notes` has been run; `npm run adopt:icons` has not, so existing stickers keep their emoji. The `lib/database.types.ts` item below is still open. One step left after this: deploy.

Most of Step 16 still hasn't been looked at in a browser; the open items under each entry below are the list.

The plan grew a step: editing a sticker was inserted as Step 16, so motion and deploy became 17 and 18.

---

## 2026-09-11 · A demo · A year of invented stickers, ending today

"Let's make a demo section, linkable from the homepage. You can use my personal data as the example. Seed the data with stickers year to date. That means we can't hardcode them, because they need to be year to this date. Average 4 stickers per day, generally spread out across areas, most moods filled out."

**What changed about the interface.** There is a second door into the app. Under the two sign-in buttons the landing page now says *"Not sure yet? Look around a year of it first"*, and it goes to **`/demo`** — the whole app, Week, Month and Trends, with no account behind it and a year of stickers already in it. A slim strip across the top says what you are looking at; the nav is the app's own, with a **Sign in** button where the avatar goes. Everything works. You can drag a sticker onto a Tuesday, tick one in the day modal, set a mood, type a note, light up an area from the tray — and none of it is written anywhere. What you cannot do is make, rename or retire a sticker: those affordances are simply absent, because they are the first thing signing in is for.

The Trends page there is the payoff. A star with all six vertices out, a ranking thirteen habits deep, eight weeks of squares per habit with Yoga visibly stopped and Meditation visibly taken hold, and a mood line with a year of shape in it.

**Decisions**

- **Generated, not seeded.** A row written into the database is written on a date and stays there. Six months later the demo's "last eight weeks" would be eight weeks of nothing and the mood line would stop halfway across the chart — rotting silently, where the only person who ever notices is a visitor. `lib/demo.ts` generates the year from today instead, so there is no such thing as stale.
- **Rolling 365 days, not 1 January to today.** "Year to date" read literally gives a demo three days long every 3rd of January. Rolling is the reading that survives the calendar: always a full year, always ending today, and on any given day the difference is invisible to somebody who has never seen the other one.
- **The same library the seed script installs**, mark for mark — six areas, thirteen habits, the same Lucide icons. A demo is supposed to be a picture of the app you would actually get, not a showreel with invented content in it.
- **Three numbers per habit: a base rate, a weekday lean, and a year-long drift.** The lean is the load-bearing one, because the strip draws whole weeks: a habit that only happens at weekends reads as a vertical stripe, and without the lean every row is the same grey static. The drift is what gives the year a *story* — Yoga stopping in the spring, Drawing arriving in the autumn — and it is the only reason Trends has anything to report. A year at a constant rate is a year with no trends in it.
- **Four a day is a constant, not a sum.** `scale` walks the window once, adds up every probability, and divides — so the thirteen weights say only how habits compare to each other, and the density of the calendar is set in one place. Edit a weight and the average holds.
- **The six areas are balanced to about three to one, and that is the one flattering thing in here.** A plausible year is mostly work, and two work habits at their honest rate put eight times as many marks down as Romance & Adventure — which draws a Life Star that is one spike and five stumps, a picture of the chart being broken rather than of a life.
- **Deterministic, seeded from the date string.** Not tidiness: the page renders on the server and again in the browser to hydrate, and a `Math.random()` anywhere below would put two different years on the two sides of that seam. FNV-1a into mulberry32, seeded with the day plus what the draw is *for*, so adding a habit doesn't reshuffle the year for the twelve already there.
- **The mood is a wave, not a coin toss.** Two slow sinusoids of 97 and 23 days plus a little jitter, phased off a fixed epoch. A line through independent draws is a hairball; what makes the Moods tab worth looking at is that March has something to do with February.
- **`local` is a flag on the real board, not a second board.** `CalendarBoard` and `TrendsBoard` render the demo unchanged; the flag turns off the network and nothing else. A demo you maintain alongside the real thing is a demo that drifts, and the first thing it stops showing is whatever changed last week. The whole of the write path is one branch in `commit`.
- **`DemoShell` *is* a second `AppShell`, though**, and for the opposite reason: the two differ only in the nav, and `AppShell` takes a `SessionUser` to hand to `UserMenu`. Threading an optional user through both would put a "what if there is nobody" branch in the signed-in app to serve a page it never renders.
- **`await connection()` on the route.** Everything on the page is a pure function of `today()`, so with no request-time API in the tree Next would prerender it once at build and serve that same year for a year. This is Next 16's documented way to say "per request", and the build output confirms it: `/demo` is `ƒ`, not `○`.
- **Ids are `demo-…`, not uuids.** The cheapest possible guard: one of these reaching a Server Action would be rejected by a foreign key rather than matching somebody's row.

**Open**

- Nothing here has been seen in a browser either. The banner, the nav's Sign in button, and the demo's own dark theme are all unlooked-at.
- A generated day can carry nine stickers (8 September does, in the 2026-09-11 window). That is within what real data can do, but the month cell has never been asked to draw it.
- Switching Month → Trends → Month drops whatever you dragged, because `DemoShell` unmounts the calendar to swap views and the demo's copy of the map is component state. The banner says nothing is saved, which is true, but this is a sharper edge than the words imply.
- The Trends page in the demo shows the *generated* year, not your edits to it — the two boards hold separate copies.
- `learning/` has no explainer for this step.

---

## 2026-09-11 · Trends, re-cut · Three tabs · A mood line · Eight weeks per habit

"In the trends section, let's remove pie and bar. I want an option to see each of your habits, and the days you did them, kind of like the github commit tracker. It's a way to track what you're doing. I'd also want to see a way to see which activities you did the most that month / year / etc"

**What changed about the interface.** The donut is gone and so is the chart switcher above it — the Life Star is just there now, no control, and directly under it sits **Most done**, a ranked bar list of the habits themselves rather than the six life areas. Below both, running the full width of the page, is **Every habit, day by day**: one row per habit, one small square per day, a year of them. It scrolls sideways and opens at today, with the habit names pinned to the left edge so they stay readable eight months in. A square is faint if you did the habit once that day and solid if you did it more. Hovering one says which habit, which day, and how many times.

**Decisions**

- **Removing the pie removed the switcher too.** With three panels behind one control, the control earned its keep; with two left, it costs a click to hide one of two answers. And the two remaining answers are in *different units* — the star counts marks per life area, the ranking counts marks per habit — so putting them behind one toggle would have implied they were two views of one number. Both on the page at once, side by side, is the honest arrangement.
- **The bar chart was kept but re-pointed.** It used to rank the six areas, which the star beside it already draws and the table beneath it already lists: three pictures of one number. Ranking the *habits* is what none of them could say — an area at thirty marks doesn't tell you whether that was thirty runs or ten runs, ten swims and ten walks. Eight rows, then "and four more habits, 11 marks between them," because that's an answer too.
- **The strip ignores the range picker, on purpose.** Everything else on the page is filtered by it; this is always the last 365 days. A density strip needs a span long enough for a rhythm to appear, and the picker's shortest option is a fortnight — fourteen squares is not a picture of anything. The heading prints the actual span and the explainer says so out loud, so the two halves of the page can't be mistaken for each other.
- **Three intensity levels, not five.** GitHub shades by commit count; a habit is done or not done. `heatLevel` gives 0, 1 and 2-or-more, mapped to nothing / `soft` / `bg`. Five steps would draw a precision the data does not have, and the palette has no graded scale to spend on it — `lib/palette.ts` deliberately keeps six hues at fixed rungs rather than a ramp per hue.
- **The empty grid is one background, not four thousand elements.** A year × a dozen habits is ~4,400 cells and nearly all of them are blank. A `repeating-linear-gradient` at the cell pitch draws the empty track in one CSS property, and only the days you actually did something become real DOM nodes — a few hundred instead of thousands, same picture. It's what makes 365 columns cheap enough to be worth having.
- **Scrolling, not squeezing.** 365 legible squares is about three laptop screens wide. The alternatives were both worse: two-pixel slivers you can't point at, or wrapping each habit into its own 53×7 GitHub block, which stacks a dozen of them down the page and gives up the one thing a row-per-habit layout is for — reading two habits against each other on the same week.
- **Row order is library order, and a retired habit still gets a row if it was done.** Ranking the rows would move them between visits and break the colour banding that makes an area readable as a block. And you stopped doing the habit, you didn't stop having done it — same position `tally` already takes on archived marks. A retired habit with nothing in the window drops out; a mark whose activity isn't in the library at all is dropped rather than given a nameless row, because `Tally.unattributed` already reports exactly that.
- **The whole drawing is `aria-hidden`, with an `sr-only` list underneath.** Same justification `ChartCard` gives and the same one the app has used since Step 13: a chart may be hidden only because the same facts are on the page in words. Announcing four thousand squares is not an accessible version of this picture. The list gives every row, in the same order: name, days out of 365, most recent.
- **Geometry in pixels, which is the exception on this page.** Everything else scales with the type; this can't, because a cell has to line up with the cell above it in a different element. One shared `PITCH` is what makes 365 independent tracks agree, and it's what lets the month labels be placed by arithmetic instead of by measuring anything.
- **No new queries.** `getStickersByDay` was already unbounded — every placement ever made ships to Trends on page load — so the strip is pure client-side arithmetic over data that was already there.
- **`VIEW` and `LINE` in `lib/charts.ts` stay at the departed donut's budget.** The box was sized for the donut's horizontal labels, which are wider than the star's. Shrinking it now would move the one card still on the page for no reason but tidiness, so the constant keeps its size and the doc says why.

**Changed**

- `lib/heatmap.ts` — new; `dayWindow`, `monthLabels`, `heatmap`, `heatLevel`, `HEATMAP_DAYS`. Zero value imports, so it runs under `node --test`.
- `lib/heatmap.test.ts` — new; 30 tests. The fixture's archived sticker is load-bearing: two tests pull in opposite directions on whether it gets a row.
- `lib/analytics.ts` — `activityTally`, `ActivityTally`, `ActivityRanking`. No library argument, unlike `tally`: a habit's name, mark and colour ride on the placement already. No zero rows, and ties break on name.
- `lib/analytics.test.ts` — a `describe("activityTally")` block with its own fixture, because the existing `days()` names every sticker after its own id and so can't tell a face bug from a sort bug.
- `components/trends/HabitHeatmap.tsx`, `components/trends/MostDone.tsx` — new
- `components/trends/Donut.tsx`, `ChartSwitcher.tsx`, `Bars.tsx` — deleted
- `lib/charts.ts` / `lib/charts.test.ts` — `ChartKind`, `CHART_KINDS`, `CHART_LABEL`, `stackOffset`, `circumference`, `donutArcs`, `sliceMidAngles` and their four test blocks are gone
- `components/trends/TrendsBoard.tsx` — no chart state; three new memos (`ranking`, `days`, `rows`) and a full-width strip below the two columns
- `components/trends/ChartCard.tsx`, `RangePicker.tsx` — docs rewritten for a page with no switcher on it
- `components/views/TrendsSkeleton.tsx` — the segmented-pill skeleton dropped, a "Most done" panel and a strip added

**State:** `tsc`, `eslint`, `npm run check:dates` and `npm run build` all green. 243 tests (was 229: −21 donut, +35 new). Uncommitted.

**Then it became three tabs.** "Now this is a lot of information at once. Let's break this up into tabs." Fair — the re-cut had put a radar, a six-row table, a takeaway sentence, a ranked bar list, a five-mood strip and a 365-column grid down one page. **Areas · Habits · Moods**, split by *unit* rather than by chart type, which is what makes it a division and not three drawers to put panels in.

- **Areas** — the takeaway sentence, the Life Star, the area table. Everything counted per life area, plus the unattributed-marks note, which is a fact about attribution and belongs nowhere else.
- **Habits** — Most done, then the year strip. Same unit, ranked first and then spread out, because "which habit" is the smaller question and the strip is easier to read once you know whose row to look at.
- **Moods** — the strip on its own. It counts *days*, not marks, and it had been third in a column under a table of a different unit, which is how a five-item answer gets missed.

**And this is not the switcher coming back.** The control deleted an hour earlier sat inside one card and chose between three drawings of the *same* six numbers. These divide the page's content. A control that hides an alternative rendering is furniture; a control that hides half the facts is navigation.

- **Underlined tabs, not the nav's pill.** The pill now means one thing — top-level navigation — and the reason is already written down two entries below: two segmented pills on one screen read as two levels of navigation and you have to remember which one holds what. That's why the Month/Week pill left the calendar. So Trends uses `variant="line"` from `components/ui/tabs.tsx`, the same underline `MarkPicker` draws inside its popover. `segment()`'s doc now says the rule out loud instead of listing the switcher as its second tenant.
- **The range picker sits beside the tab list, outside all three panels.** It governs every tab, so putting it inside would mean three copies of one control or a control that looks like it resets when you switch. The one thing it doesn't filter is the year strip, and the strip answers that itself — it prints its own dates and says so in words.
- **Radix mounts one panel at a time, which the skeleton gets to exploit.** `TrendsSkeleton` used to reserve four heights and be wrong about at least one every time; the strip in particular was a deliberate under-guess because the row count isn't knowable before the library query lands. Now it draws the Areas tab only. Areas is always where you land, and the other two are behind a click that happens after the data has arrived — so there is nothing left to guess. That open item from an hour ago is closed by the layout rather than by a better guess.
- **Readout lost the mood strip and kept the export.** It's the sentence and the table now. `MoodStrip` still lives in that file — same kind of composed-not-computed panel, nowhere better to be — and `TrendsBoard` mounts it on its own tab.
- **The Habits tab's empty state is a sentence, not the dashed card.** When the range holds nothing, the ranking has nothing to draw but the rolling-year strip under it still does, so a box announcing "nothing here" would be contradicted by the thing directly beneath it.
- **Most done is capped at `max-w-2xl`.** `normalize` always runs the top bar to the full width of its track, and across a whole page that's a foot of solid colour saying one number.

Changed: `components/trends/TrendsBoard.tsx` (tabs, three panels), `components/trends/Readout.tsx` (narrowed to sentence + table), `components/views/TrendsSkeleton.tsx` (Areas only), `lib/layout.ts` (`segment()` doc). No new components and no new tests — the split is layout, and every number in it was already computed and already covered.

### Then the moods got a line.

"For the moods section, I'd like to see a line chart over time, for how my mood has gone up or down"

**What changed about the interface.** The Moods tab opens with a new panel, **Mood over time**: a wide, low chart with the five moods as labelled gridlines — Great at the top, Rough at the bottom — a dot for every day you logged, and a line running through them. Above the drawing, in the same large type the Areas tab uses for its takeaway, is the reading in words: *"Your mood has been climbing this month, across 23 logged days."* The strip of five faces is still there, underneath.

The line runs straight through the dots — no smoothing, no curve. Where you went more than a week without logging anything, it stops and picks up again on the other side.

**Decisions**

- **Five moods became five numbers, and the liberty is taken in the open.** Great is 5 down to Rough at 1. The five moods are an *ordinal* scale — they have an order and nothing else, and nobody has established that Great→Good is the same size a step as Low→Rough. A line needs a height and a height is a number, so the assertion gets made; it's made once, in `MOOD_SCORE`, with the reasoning above it, rather than three levels down inside a component. What it costs is that the line's *value* means nothing, so the chart never prints one — no numeric y axis, no "3.4" in the sentence. What survives is the direction, which is true under any scale that keeps the order.
- **Ink, not a hue, and that was never in question.** Three files already say it — `MoodMark`, `wash()` in `palette.ts`, `highlight.ts` — six colours mean six life areas, everywhere. A green line for a good stretch would be a seventh meaning for a colour that has one, one tab away from the star that owns it.
- **Positioned by date, not by index.** Three days logged in a row and three logged a month apart are not the same picture, and evenly spacing them would draw them identically. So `MoodPoint.at` is a 0–1 fraction of the span, gaps included — which is also what makes the breaks in the line legible as breaks rather than as missing data.
- **The line breaks after a week unlogged.** A straight segment between two points is a claim about what happened in between. Across three days that's harmless and it's what makes the series readable; across three weeks it's an invention, and it would look exactly like a fortnight you did log. A week is the boundary because it's the unit the rest of the app thinks in.
- **It drew a rolling mean for about an hour, and that was wrong.** *"I don't want a trendline, I want an actual line connecting the dots."* Two things were wrong with the mean beyond her not asking for it. The curve sat *off* the points it was computed from, so on a scale whose entire content is five named rungs the drawing passed through heights that are not moods. And it answered a question that was already answered better one inch above it: the direction is stated in words by `moodTakeaway`, which beats eyeballing a curve. What a picture can do that a sentence can't is show the actual days — so that is all it does now. `MOOD_SCORE` survives, because the dots still need heights; `SMOOTH_FROM`, `SMOOTH_WINDOW`, `centredMean`, `MoodPoint.trend` and `MoodSeries.window` are gone.
- **The dots are `fill-ink`, not muted.** They were the faint evidence under a confident line. With the line running through them the relationship inverts: the dots are the measurements and the segments between them are the only interpolation in the drawing, so the marks are solid and each vertex is something you can point at.
- **"Steady" is a claim, so it needs enough data to have been able to say otherwise.** Under six logged days `moodDrift` returns null and the sentence says *"4 logged days this month — not enough yet to call a direction"* rather than reporting a flat run. The verdict compares the mean of the first half against the last, not the first point against the last, so one rough Tuesday at either end doesn't decide it; the threshold is half a rung, because the scale's own resolution is one rung and less than half a step is which days you happened to open the app on. At six points a single outlier *can* still swing it — three days a side is a third of the evidence — and there's a test asserting exactly that, because it's a property of the sample size rather than a bug to tune away.
- **Its own `viewBox`, 880×260, and explicitly not `charts.ts`'s `VIEW`.** That box is 520×320 because two *radial* charts had to share a frame and its width is budgeted for area names sticking out past a ring. Borrowing it would give a time series a near-square box, and the slope of a line is an artefact of its aspect ratio — squaring it steepens every change into something more dramatic than it was.
- **The sentence is a prop, not something the component works out.** Same split as `Readout`: `moodTakeaway` lives in `lib/analytics.ts` where the branching is reachable by `assert`. It's also what makes the chart's `aria-hidden` legitimate — for anyone not looking at it, that line *is* the chart. The `sr-only` note under it adds only what the axes say (the two dates, the count, whether it's smoothed); the days themselves aren't listed, because a year of "12 March, Good" is not a reading of a trend and a single day lives on the calendar.
- **Under two points there's no panel at all.** One dot in an empty grid says "one day, and it was Okay", which is the sentence above it printed larger. The strip below has its own empty state and says the useful thing — where to go and log one.
- **`dayToUTC`/`utcToDay` moved out of `lib/heatmap.ts` into a new `lib/daymath.ts`.** The codebase's own rule, cited in `charts.ts`: it moves when the second caller arrives, not before. `moodSeries` needs day differences and `lib/dates.ts` can't supply them — it imports date-fns, and a `lib/` module under `node --test` can only take value imports from modules that import nothing. Everything in there is UTC, because a `DayString` is a calendar square rather than an instant: DST makes two local days 23 and 25 hours long, and local-date arithmetic across one of them lands at 23:00 the previous evening.

Changed: `lib/daymath.ts` (new), `lib/daymath.test.ts` (new, 15 tests), `lib/heatmap.ts` (repointed at it), `lib/analytics.ts` (`MOOD_SCORE`, `moodSeries`, `moodDrift`, `moodTakeaway`), `lib/analytics.test.ts` (23 more), `components/trends/MoodLine.tsx` (new), `components/trends/TrendsBoard.tsx` (the Moods panel).

### Then the two habit panels were paired.

"For habits, let's find a way to put the two graphs side by side if there's enough room, or one on top of the other while being the same width if there isn't. It doesn't need to be a 365 day window for the bottom graph"

**What changed about the interface.** On a wide screen the Habits tab is now one row: **Most done** on the left in a fixed 20rem column, **Every habit, day by day** on the right taking the rest. Narrower, they stack — and both are the full width of the column, so neither is arbitrarily narrower than the other. The strip is framed in the same card as the ranking, with a heading at the same size, so the two read as a pair rather than as a panel and some loose content below it.

The strip is **the last eight weeks**, down from a rolling year. At a legible cell size it now fits its column outright, so on a laptop there is nothing left to scroll.

**Decisions**

- **The window shrank, not the cell.** 365 days at 6px is about three screens wide, which is why the strip could only ever be a full-bleed band under everything else — and the eleven months you had to scroll past were eleven months nobody looked at. The floor on a cell is about 6px; under that it stops being a mark you can point at and becomes texture. So the span gave way: **eight weeks, 56 squares, 574px of drawing including the name gutter**, which fits the wide column with room to spare.
- **A multiple of seven, and that is the load-bearing half.** Every column is the same weekday, which is most of what makes a density picture readable — "I only ever do this at weekends" is a vertical stripe when the weeks line up and nothing at all when they drift. `HEATMAP_WEEKS = 8`, `HEATMAP_DAYS = HEATMAP_WEEKS * 7`, with a test asserting the multiple rather than the number.
- **20rem and the rest, not two halves.** A ranking is short names with bars behind them and stops improving past about twenty characters; the strip is fixed-pitch squares that either fit or scroll. Pinning the narrow one to what it needs and giving the wide one the remainder is also what lets the strip's geometry be budgeted against a real number instead of a guess.
- **`xl`, and the breakpoint is arithmetic rather than a device.** 20rem + the gap + 574px + the card's padding is about 1070px of content. `max-w-6xl` less its gutters gives 1072 at an `xl` viewport and less than that at `lg`, so `lg` would have put the two side by side and immediately made the strip scroll.
- **`max-w-2xl` came off Most done.** It was there because `normalize` runs the top bar to the full width of its track and a foot of solid colour says one number. The grid column now does that job, and doing it twice would leave the ranking narrower than the card beside it — which is the thing she asked to stop happening.
- **The strip kept its scroller.** It is a no-op at the width it's designed for and it is the honest fallback on a phone, where 574px does not fit anything. What it no longer does is define the layout.
- **The strip grew a card and lost a heading size.** `text-panel-title` down to `eyebrow`, matching `MostDone` exactly: two peers in one grid row with headings at different sizes is a hierarchy the content doesn't have. The pinned name gutter's background went `bg-bg` → `bg-surface` to match what it now sits on.

Changed: `lib/heatmap.ts` (`HEATMAP_WEEKS`, the window, three stale comments), `lib/heatmap.test.ts` (the whole-weeks assertion, month labels retested at both lengths), `components/trends/HabitHeatmap.tsx` (geometry, card, copy), `components/trends/TrendsBoard.tsx` (the grid).

**State:** `tsc`, `eslint`, 283 tests, `npm run check:dates` and `npm run build` all green. Still uncommitted, still unseen in a browser.

**Open**

- **Never seen in a browser.** Verified by types, lint, tests and a build only — browser automation has been unavailable all session. Four things can only be confirmed by looking: the strip's scroll-to-today effect, the pinned name gutter's opaque background against the squares sliding under it, the month labels' alignment over their columns, and whether the underlined tab row sits right under a 3rem page title at `text-[0.95rem]`.
- **A long habit name truncates in the gutter, which is now 128px rather than 176.** Three-quarters of the room it had. Same open question as the week view's bars, with less margin.
- **The strip on a phone is untested.** It scrolls, so it should survive, but the pinned gutter is 128px of a 390px screen.
- **The two-column Habits row has only been checked on paper.** The 20rem / remainder split and the `xl` breakpoint are both arithmetic against `max-w-6xl`; whether 20rem is actually enough for the longest habit name plus a bar worth comparing is a thing to look at.
- **The mood line's gutter is a calculation, not a measurement.** 52 viewBox units, budgeted against "Great" at 12 units and an estimated 0.45em per character. SVG can't reflow text and the root `<svg>` clips at the viewBox edge, so if the estimate is short the failure is a silently sliced label. Worth a look at the widest and narrowest the card gets.
- **A year's worth of dots is untried.** Pick "All time" with a year of daily moods and the chart draws 365 circles across 814 units — about two units apart, at r=3. They will overlap, and the line behind them will be a solid zigzag. Whether that reads as a dense record or as mud is the kind of thing only looking can settle; if it's mud, the answer is probably that the dots thin out past some count, not that the line goes back to being a mean.

---

## 2026-09-10 · The week

"Add a 'week' section. 7 sections (columns), one for each day in the week. Same arrows for going forward or backward. Sticker tray available to drag into the days, but because there's more room we'll include the whole word into the rectangular bar that will be the sticker. Color coded the same way. At the bottom of each day, a space for notes about that day. short notes or summaries."

**What changed about the interface.** There is a Month/Week pill next to the calendar title. In week view the grid becomes seven full-height columns, one per day, each headed by its own weekday name and date. A sticker dragged in from the tray lands as a rectangular bar with the activity's name written in it, tinted the same colour it has in the month grid. Under the stack, each column ends in a two-line note field — click it, type, click away, and it saves. The arrows and the tray are the same ones; nothing else on the page moved.

**Decisions**

- **A toggle inside the calendar, not a third section in the top nav.** Everything the week needs already exists on this page and is stateful: one `DndContext`, the tray, the day modal, the optimistic map, the error region. A separate route would have meant a second copy of all of it, and "same arrows" would have been two components that happened to look alike. It also keeps exactly one grid mounted at a time, which matters because both grids register droppables under the same day ids.
- **One `anchor: Date` serves both views.** Switching Month↔Week keeps your place instead of snapping back to today — the week you land on is the week containing the day you were looking at.
- **`MonthGrid` lost its head.** It used to own the month, the title, the arrows and the deck transition. All four moved up into `CalendarPanel`, and the grid is now purely derived from a `month: Date` prop. `MonthHeader` is gone; `PeriodHeader` replaces it and takes a unit word, so the arrows read "Previous week" or "Previous month" from the same code.
- **The transition types are now `step-next` / `step-previous`.** They were `month-next` / `month-previous`, and the animation is unchanged — the same 8% slide and fade — but the unit isn't a month any more. The CSS class names (`deck-next`, `deck-previous`) stayed, because they describe the picture rather than the unit.
- **`DropSlot` grew an axis.** A month cell lays marks out in a row and wants a vertical caret; a week column stacks them and wants a horizontal one. The slot carries `axis` in its droppable data, and the collision function in `CalendarBoard` reads it to decide which direction is "along" and which is the cross axis it weights ×4. That weighting is what makes a slot in the column you're over beat a slot one column across.
- **`DraggableMark` takes a `shape`, which is the opposite call from the one made about `DraggableSticker`.** Those two stayed separate because their *behaviour* differs. Here nothing behavioural differs at all — same drag, same data, same overlay — only the picture, so a prop is right and a second component would be a copy of thirty lines to change one child.
- **Notes are stored as a row or not at all.** Emptying a note deletes the row rather than writing `""`, so `null` is the only "no note" and there is one empty state instead of two that render identically. `applyChange` trims and nulls the same way the action does, which is the usual second-copy-of-a-rule, so it's tested.
- **The note commits on blur, not on keystroke.** Prose typed at speed would otherwise be one server action per character. Escape reverts and blurs. A render-time guard adopts a newly saved value without clobbering what you're in the middle of typing.
- **Moods stay circles in both views.** A mood belongs to the day rather than to the stack inside it, and it sits in the column header either way — so the drag overlay only becomes a bar for activities.

**Changed**

- `components/calendar/viewMode.tsx` — new; the Week/Month context, provided by `AppShell`
- `lib/nav.ts` — three sections (`week`, `month`, `trends`) and `isCalendar`
- `components/calendar/period.ts` — new; `CalendarViewMode`, `Landed`, and the `PeriodProps` both grids take
- `components/calendar/CalendarPanel.tsx` — new; owns the anchor, the title, the deck transition, and which grid is mounted
- `components/calendar/PeriodHeader.tsx` — new; title and arrows (replaces `MonthHeader.tsx`, deleted). It had the Month/Week pill for an afternoon; the nav has it now.
- `components/calendar/WeekGrid.tsx`, `WeekDayColumn.tsx`, `StickerBar.tsx`, `DayNote.tsx` — new
- `components/calendar/MonthGrid.tsx` — rewritten as a derived grid with no state, header or transition
- `components/dnd/DropSlot.tsx` — `axis` prop, carried in the droppable data
- `components/dnd/DraggableMark.tsx` — `shape` prop
- `components/dnd/CalendarBoard.tsx` — `view` state, axis-aware collisions, bar-shaped overlay in week view
- `lib/dates.ts` — `weekGrid`, `toWeekString`, `stepWeek`, `formatWeekTitle`
- `lib/stickers.ts` — `DayStickers.note`, `NOTE_MAX`
- `lib/changes.ts` — the `note` change
- `lib/queries/stickers.ts` — third query for `day_notes`
- `app/actions/stickers.ts` — `setDayNote`
- `scripts/day-notes.sql`, `package.json` (`npm run db:notes`), `lib/database.types.ts`
- `app/globals.css` — the deck comment now names the right transition types

**State:** `tsc`, `eslint`, 229 tests, `npm run check:dates` (33 assertions) and `npm run build` all green. Uncommitted.

**Three fixes after the first look in a browser.**

- **Notes saved and never came back.** `getStickersByDay` ran the third query and then had no loop to fold its rows into the map, so every note round-tripped to Postgres correctly and rendered as an empty field. Worth remembering as the shape of the bug: the query, the guard and the types were all right, and the four lines that used the result were missing.
- **The field grows with the note now.** It was two fixed rows. The height comes from a hidden twin `<span>` sharing the textarea's grid cell and its typography — CSS rather than measuring `scrollHeight` in an effect, because an effect runs after paint and a saved four-line note would render short and jump. Grid rows stretch, so a long Thursday makes the whole week taller and each note stays at the bottom of its own column.
- **And then the growth went the wrong way, twice.** First the stack above the note was `flex-1` — a zero flex-basis, no height of its own, only leftover space — so a note gaining a line took it from the stickers. `grow shrink-0` fixed that and changed nothing visible, because the real culprit was where the minimum height lived. `min-h-[26rem]` was on the *column*, and a column with four stickers in it is twenty rem of dead air: a longer note just ate the air, and the column only exceeded 26rem once everything together did. The floor now sits on the sticker stack instead (`STACK_FLOOR`, now 24rem — see the scrolling note below), the column has no minimum at all and is the sum of its parts — so a line added to a note is a line added to the column, from the first one. And the last piece was the note's anchor: with the stack set to `grow`, the note was pinned to the bottom of its column, so a longer note expanded *upwards* — the hairline above it climbed into the sticker area and the column's bottom edge never moved. The stack no longer grows. The hairline sits in the same place in all seven days, the note grows downwards, and the column gets taller to hold it. The trade is that a short note sits under its own hairline with spare height below rather than on the floor of the column: tops aligned instead of bottoms, which is the right way round for the first line of a sentence. All seven stay level, because that is what a grid row does.

**The week's day header lost the pencil.** Weekday, numeral, mood face and pencil is four things across a 100px header, and it read as clutter where the month cell's three do not — the month cell's pencil shares a run with the marks rather than with the date. It moved to a row of its own between the sticker stack and the note's hairline, right-aligned, which is the one band in the column that was genuinely spare. That row is 28px the column didn't have, so `STACK_FLOOR` gave back the same 28px (24rem → 22.25rem) and the resting height is unchanged.

**Week and Month became nav sections.** "Let's make the top nav 'Week Month Trends' and remove the tabs next to the arrows." That reverses the first decision in this entry, and the reason it reverses cleanly is that the decision was about *state*, not about where the control sits. Both sections render the same `calendar` node and neither unmounts it, so there is still one `DndContext`, one tray, one optimistic map and one grid mounted at a time — the thing a second route would have cost. What changed is only who holds the value, and `AppShell` can't pass it down: the calendar arrives there as `props.calendar`, a finished server-rendered node, and a node cannot be given a prop. So it goes through context (`components/calendar/viewMode.tsx`), which crosses the server-rendered markup in between without trouble because the provider and the consumer are both client components. `PeriodHeader` is back to the period and two arrows.

The argument for the old pill was that month-or-week is a lens on a page rather than a place you can be sent to, which is still true of the URL and turned out not to be what decides. Two segmented pills on one screen read as two levels of navigation, and having to remember which of them holds Week is worse than the inaccuracy. Month is still the landing section even though Week is listed first.

**And the page fits a 14" laptop.** "On the week page, it shouldn't scroll, because it doesn't go past the page, so I don't know why it does but it does." It wasn't the calendar. The sticker tray caps its own height at `calc(100vh - 8rem)` so it can scroll internally on a long list — but the tray's top edge sits 120px down the page (64 of nav, 56 of `main`'s old `py-14`) with another 56 below it, so the tray alone was 48px taller than the window on a week that ended well above the fold. The cap is arithmetic about the padding above and below it, and it has to be kept in step with it: `py-10` now, so `calc(100vh - 9rem)`.

With those 144px of chrome fixed, the rest was finding the vertical budget for the grid — about 850px of content area on that screen, minus 48 of title and 24 of panel gap. The month grid spends it on six rows: the weekday labels went from `py-3` to `py-2` and a day cell's floor from `min-h-32` to `min-h-24`, which is 96px a row and makes a quiet month fit. A *busy* month still runs past the fold, deliberately — `min-h-24` is a floor and marks set the real row height, so the number to change if that matters more is the mark size. The week spends it on one row, so `STACK_FLOOR` went up rather than down: 19rem left an empty week floating in the top two thirds of the screen, and 24rem fills it with about three lines of note growth in hand before the window has to scroll.

**Open**

- **Run `npm run types:db`** when convenient, to replace the hand-written `day_notes` block in `lib/database.types.ts` with a generated one.
- **Column height is still a guess, from the other end.** `STACK_FLOOR` is 24rem of sticker room per column, picked to fill a 14" screen without scrolling it. On a larger display an empty week will sit higher than it needs to; on a smaller one, sooner than expected, a second line of note will start a scrollbar.
- **Bar text truncates.** Long activity names get an ellipsis rather than wrapping to two lines. Fine for "Gym", unknown for "Coffee with a friend".
- **Seven columns on a phone is untested.** The grid is `grid-cols-7` with no breakpoint below it.

---

## 2026-09-09 · Icons, not emoji

"Replace all emoji used as icons throughout the app with SVG icons from Lucide, installed as a package rather than inline emoji characters… Build a central icon map so there's one source of truth… Keep icon size and stroke width consistent across all instances."

**What changed about the interface.** Every mark in the app is now a line drawing at one weight. The tray, the calendar squares, the mood row and the login background all draw from the same set, so a Tuesday with four stickers on it reads as four members of one family instead of four fonts' worth of colour emoji. The picker on the sticker form is now an icon picker: eight groups, 432 icons, searchable by name. Body text across the app moved to DM Sans, the landing paragraph re-tuned to land on three lines, and the login page's sticker field fills out to the left and right of the words.

**Decisions**

- **One map, `lib/icons.ts`, and the ids in it are database values.** A mark is stored as `icon:<id>` in `activities.mark`. That makes renaming an id a data migration, not a refactor — the generator that builds this file now refuses to drop an id that's already shipped, because an orphaned row renders as the literal text `icon:laptop` in a calendar square, which is exactly how the one that got away was found.
- **Emoji still render.** A mark that isn't `icon:`-prefixed falls through to the old path. That's what makes the migration a `UPDATE` you can run whenever (`npm run adopt:icons`) rather than a flag day, and it's why an existing sticker with 🏃 on it is not broken right now — just not yet converted.
- **Eight icons are hand-drawn.** Lucide has no tennis, basketball, golf, ski, surf, rowing, climbing or yoga pose. Adding a second icon family for them would have undone the whole point, so they're drawn on Lucide's own 24px grid with `createLucideIcon` and live in `lib/icons-custom.ts`.
- **Size and stroke are two exported constants**, `MARK_ICON_SIZE` (`size-[1.25em]`, so the icon scales with whatever type size its container sets) and `MARK_STROKE` (1.5). Nothing sets either inline.
- **The mood row was left alone**, deliberately. Its five faces are a scale, not a vocabulary, and a scale reads better as faces than as line drawings.

**Changed**

- `lib/icons.ts` — new; 432 icons in 8 groups of 54, plus the lookup and the two constants
- `lib/icons-custom.ts`, `lib/icons.test.ts` — new
- `components/tray/EmojiPicker.tsx` → `MarkPicker.tsx`
- `lib/emoji.ts`, `scripts/build-emoji.mjs` — deleted
- `scripts/adopt-icons.sql`, `scripts/seed.sql` — the emoji→icon mapping
- `components/calendar/StickerMark.tsx`, `DayMoodButton.tsx`, `components/tray/*`, `components/trends/*` — draw from the map
- `app/layout.tsx`, `app/globals.css` — DM Sans as the body face
- `app/login/page.tsx`, `components/auth/FloatingStickers.tsx` — three-line subtitle, four more stickers, wider middle band
- `components/auth/PointerNudge.tsx`, `components/ui/*` — pointer cursor on the buttons that are buttons

**State:** green under `tsc`, `eslint`, tests and `build`. Uncommitted.

**Open**

- **`npm run adopt:icons` hasn't been run.** Until it is, existing stickers keep their emoji.
- **The Google avatar is still missing in the top-right.** Needs the DevTools Network status code for the `googleusercontent` request to tell the three causes apart: 403/429 wants `referrerPolicy="no-referrer"`, 404 means a stale `avatar_url`, and no request at all means empty user metadata.

---

## 2026-09-04 · Step 16, revisited · A smaller sticker form

"I want to shrink the new sticker page considerably, it's not so complicated that it needs a 'preview' section. Remove 'A mark, a name, and where it belongs.'. You can put the color of the life area background in the same place the user picks the emoji, they don't need to be separate. Life area should be at the top."

**Decisions**

- **Life area moved to the top, and that one move is what let everything else go.** The area decides the colour, so once it's chosen first, the mark field below can simply *be* the sticker — the same tint and ring `StickerMark` draws in the tray, wrapped around the input you type into. The order was create-shaped before (mark, name, then where it goes); it's now colour-shaped.
- **The preview is gone, because the form now shows you the thing instead of a copy of it.** It was doing real work when it was the only coloured circle on screen — Step 16 wrote down that changing the area repaints it before you commit. It still does that. It's just the field now, so there aren't two circles saying the same sentence, one of them `aria-hidden` because every word in it had been typed two inches below.
- **The emoji picker is a badge on the corner of that circle, not a button beside it.** Picking a mark and seeing the mark were two controls in a row; they're one control now. The input behind it is unchanged and still the value — you can type or paste a letter and never open the picker — which is why it stays an `<input>` under a transparent fill rather than becoming a button.
- **The colour sits on the wrapper, not on the input, and that's a shadcn detail worth knowing.** `Input` carries `dark:bg-input/30`. `tailwind-merge` resolves conflicts within a variant, so a plain `bg-ramp-green-tint` loses to it in dark mode and only in dark mode. Ring and fill on the outside, `bg-transparent dark:bg-transparent` on the inside.
- **The resting sentence under the dropdown went; the warning stayed.** "It takes that area's colour, and names are unique within it" was permanent text explaining two things the form now demonstrates — the mark wears the colour the moment you pick an area, and the uniqueness rule only matters at the moment you break it, when the error says so in the same words. The past-marks-move warning still appears, and now only appears.
- **The "Mark" label went too, replaced by `aria-label`.** The circle is 44px across; a word above it is wider than the control it names. Name keeps its `<Label>` — a text field with no visible label is a different and worse trade.
- **`aria-describedby={undefined}` on the new-sticker dialog is deliberate.** Radix warns about a dialog with no description, assuming a missing one is an oversight. The subtitle used to name the area you'd pressed `+` on, and the area is now the first field in the form, already filled in.
- **Both dialogs shrank, because both use `StickerFields`.** Edit gets the same four changes. Its own subtitle ("Change its mark, its name, or where it belongs") is untouched — it wasn't the one named, and it describes a dialog with no trigger context of its own.

**Changed**

- `components/tray/StickerFields.tsx` — preview removed; area first; the mark field is now the sticker circle with the picker on its corner; the resting sentence dropped
- `components/tray/EmojiPicker.tsx` — trigger takes a `className` and drops to `icon-xs`
- `components/tray/NewStickerForm.tsx` — no `DialogDescription`

**State:** `tsc`, `eslint`, 195 tests, `npm run build` all green. New classes confirmed in the compiled CSS: `size-11`, `-right-1`, `-bottom-1`, `font-emoji`, `size-6`. Uncommitted.

**What to look for.** Open the `+` on Health: the dialog is a title, a dropdown, a circle, a name field, and two buttons. The circle is already Health's colour, with a small emoji button on its bottom-right corner. Change the dropdown to Work and the circle turns blue under your typing. On an edit, changing the area also brings back the line about past marks moving — and that line is the only thing under the dropdown now. Type a letter straight into the circle; it should still take it.

**Open**

- **The badge overhangs the circle by 4px at the bottom**, and the row is bottom-aligned to the name input. Whether that reads as sloppy or as a badge is a look-at-it question.
- **44px circle, 32px name field.** Two different heights side by side, intentionally — worth confirming it doesn't read as a mistake.

---

## 2026-09-04 · Step 17 · Motion, waiting, and a way to turn it off

"Lets increase the modal fade timing, making sure it comes in with an ease-out curve. Lets definitely include a prefers-reduced-motion track. lets tab through months like a deck perhaps, where it's like you're cycling through to the next page. landing on a placed mark sounds good. If we have to use ViewTransition that's fine. Let's also make sure the animations on the way in for a modal are different from on the way out (faster on the out), same with all kinds of little menus like that. but make them all longer than they are now so they read as intentional, but not slow. Let's start there and then evaluate what else we might want."

**Decisions**

- **Every duration is a token, and there are six of them.** `--dur-panel-in: 260ms` / `--dur-panel-out: 160ms`, `--dur-menu-in: 180ms` / `--dur-menu-out: 120ms`, `--dur-deck: 340ms`, `--dur-land: 420ms`. Two rules generate all six: an exit is about two-thirds of its entrance, and the bigger the surface the longer it takes. A dialog covers the page; a dropdown covers a corner of it.
- **100ms wasn't a fast animation, it was a jump cut with extra frames.** Every enter and exit in the app was a flat tenth of a second, which is below the point where movement registers as movement — you see the before and the after and nothing in between. 180–260ms is where a transition reads as deliberate without making you wait.
- **In decelerates, out accelerates.** `--ease-enter` is a strong ease-out (60% of the distance in the first quarter of the time), `--ease-exit` its opposite. The default `ease` is symmetric, which is why a dismissed dialog felt sluggish even at 100ms: it spent its first frames barely moving, on its way out.
- **The timing rides on Tailwind's own utilities, with nothing custom in between.** `tw-animate-css` writes its keyframe shorthand as `enter var(--tw-duration, .15s) var(--tw-ease, ease)`, and `duration-*` / `ease-*` are exactly the utilities that set those two variables. So `data-open:duration-[var(--dur-panel-in)] data-open:ease-enter` steers a Radix animation the same way it would steer a transition.
- **Reduced motion rewrites the tokens rather than the rules.** Six lines in a `@media (prefers-reduced-motion: reduce) { :root { … } }` reach the dialog, all four menus, the deck and the landing mark at once. The blanket `*` rules under it are a backstop for anything that hardcodes a duration later.
- **1ms, never 0s.** Radix keeps a closing dialog mounted until its animation fires `animationend`, and a zero-duration animation is entitled not to fire that event. Zero the durations and the overlay stays in the DOM holding focus and swallowing clicks — the dialog looks closed and the page is dead.
- **The month deck needs `<ViewTransition>` because React unmounts the old month before the new one paints.** Everything that animates *out* in this app so far is Radix, and it works only because Radix delays unmount until its animation ends. Nothing does that for a plain `setState`. `<ViewTransition>` solves it from the other side: the browser screenshots both trees and interpolates between them. `experimental.viewTransition` in `next.config.ts`; `types/react-canary.d.ts` is the one line that makes `import { ViewTransition } from "react"` typecheck.
- **Three things have to be true for the deck to run, and each is silent when it isn't.** (1) `startTransition` — a bare `setState` animates nothing and warns about nothing. (2) `addTransitionType("month-next")`, because direction *cannot* be a prop: React reads the exit animation off the outgoing month, which rendered before you clicked, so its props can't know which arrow you pressed. (3) A changed `key` and **no** `name` — with a name React morphs one month into the other instead of treating it as an exit and an enter.
- **`default="none"` is load-bearing, not tidiness.** Every sticker change commits inside a `startTransition`, and a `<ViewTransition>` with no default animates on *any* transition that touches it. Without it, dropping a sticker on a Tuesday would slide the whole month sideways.
- **The deck travels 8%, not a page width.** A calendar isn't a page you flip away from; it's the same grid holding different days. Enough sideways motion to say which direction you went, and the fade does the rest. Small also keeps the snapshots from sweeping across the rest of the layout — a view-transition pseudo-element is attached to the document root and is *not* clipped by the box its source element lived in.
- **The literal page-turn was built and rejected.** Stephanie asked for no fade, "so it reads more like flipping through a book". That version dropped the fade entirely, slid a full page width, and gave each page a `clip-path` that cancelled its own slide — arithmetic that keeps the visible ink inside the frame at every frame without relying on `::view-transition-group(…) { overflow: hidden }`, which five headless-Chrome runs couldn't confirm either way. It worked. She looked at it and didn't like it, so it came back out. **The reason it doesn't fit is worth keeping: a page turn is an event, and stepping between two views of the same grid isn't one.** A book fades nothing because it has an edge to hide the page behind; on screen, with no edge, opacity *is* the edge, and a fade-free version has to earn the frame it needs.
- **The month name fades and does not slide; the arrows don't move at all.** Two elements sliding the same distance read as one plane moving, which is right for the deck and wrong for its label. The arrows sit outside the transition, so there is always one fixed thing to aim at.
- **The live region stays put and its contents get replaced.** `aria-live` announces changes *within* a region — remounting the `<h1>` along with its text can leave a screen reader with nothing to report — so the `<ViewTransition>` went inside the heading, around a `<span>`.
- **The landing animation is on the placed mark, not on dnd-kit's drop.** dnd-kit's drop animation flies the overlay back to where the drag *started*, which for a tray drag means sailing into the rail at the moment it should be settling onto a Tuesday. Animating the outcome instead means the same motion plays whether the mark arrived by drag or by a checkbox in the day modal — which has no gesture at all.
- **`DayCell` keys its marks by `activityId` now, not `sticker.id`, and the animation is why.** A placed sticker renders first under an optimistic `pending:…` id and again under the server's uuid a fraction of a second later. Keyed by id that's an unmount and a remount, restarting the landing animation halfway through itself. The activity is unique within a day — the table's own constraint says so — and it doesn't change underneath the element.
- **A timer clears `landed`, not `onAnimationEnd`.** The element may not survive its own animation: a cross-month move unmounts the mark mid-flight, and an event that fires on a removed node never arrives.
- **`LANDING_MS` is written twice, in two languages.** CSS owns the animation, JS owns the cleanup, and neither can read the other's value without a `getComputedStyle` on every placement or a stylesheet built from a module. Both cost more than one number is worth. The drift failure is mild and self-correcting; a comment on each is the link.
- **The empty states were already done, so the states half of this step is all about waiting.** `TrendsBoard` has had `Empty` since Step 12 — three different sentences depending on whether the range is unfinished, narrow, or genuinely your first day — and the tray has one too. Nothing to add there; what the page didn't have was anything to show *before the data existed*.
- **Two sibling `<Suspense>` boundaries, not a `loading.tsx`.** The bundled streaming guide is explicit that a `loading` file is a valid boundary high in the tree, so the framework stops there and the whole page falls back to one skeleton instead of streaming in pieces. Two boundaries mean the nav and the page frame paint as soon as the auth check returns, and each tab arrives on its own.
- **`getUser()` stays above both boundaries, and that's a rule.** Once a fallback renders, the response has committed to `200 OK` and the headers are gone — a `redirect()` after that degrades from a real HTTP redirect to a client-side one. The auth check is one fast call; the two page queries are the slow pair, and those are what the boundaries are around.
- **The skeletons copy the layout classes rather than sharing a component, on purpose.** A skeleton's whole job is to occupy the exact space the real thing will, because the browser reflows when a fallback is swapped out and a fallback of the wrong height is a visible lurch on every load. The real board's wrapper lives inside a `DndContext` with a dozen handlers; what's worth sharing is four class names. What *is* imported is the pair that would drift silently — `WEEKS_IN_GRID`, so the grid is always six rows, and `ChartCard` itself, so the tallest box on Trends can't disagree with the chart's own ratio.
- **Both queries are `cache()`d now, and the boundaries are what exposed the need.** Both tabs render on the server every request even though one is off screen, so the page was opening four round trips for two distinct questions. `cache` memoizes for the life of one request: the second caller awaits the first one's promise. It expires with the request, so a Server Action that writes and revalidates still reads fresh rows.
- **One `role="status"` per skeleton, not per block.** The shapes are empty divs and announce nothing on their own; the container carries a polite live region and a `sr-only` sentence, so a screen reader hears "Loading your calendar" once instead of forty silent shapes or one interrupting alert.

**Changed**

- `next.config.ts` — `experimental.viewTransition`
- `types/react-canary.d.ts` — new; `/// <reference types="react/canary" />`, because `next-env.d.ts` says not to edit it
- `app/globals.css` — three easing curves and `--animate-land` in `@theme`; six `--dur-*` tokens in `:root`; `land`, `deck-slide` and `deck-fade` keyframes; six `::view-transition-*` rules; the reduced-motion block
- `components/ui/dialog.tsx` — overlay and panel: the one flat hundred-millisecond duration replaced by the panel pair
- `components/ui/popover.tsx`, `components/ui/select.tsx`, `components/ui/dropdown-menu.tsx` (×2) — same, with the menu pair
- `components/calendar/MonthGrid.tsx` — `step()` wraps the state change in `startTransition` + `addTransitionType`; the grid is wrapped in a keyed `<ViewTransition>`; exports `Landed`
- `components/calendar/MonthHeader.tsx` — the title crossfades inside a stable `<h1>`
- `components/dnd/CalendarBoard.tsx` — `landed` state, `arrivalOf`, `LANDING_MS`, the clearing effect
- `components/calendar/DayCell.tsx` — `landed` prop; marks keyed by `activityId`
- `components/dnd/DraggableMark.tsx` — `landing` prop → `animate-land`
- `components/ui/skeleton.tsx` — new; one grey block, `bg-secondary` so it reads at the surface's own weight in both themes
- `components/views/CalendarSkeleton.tsx`, `components/views/TrendsSkeleton.tsx` — new; the two fallbacks
- `app/page.tsx` — a `<Suspense>` around each view, both still passed to `AppShell` as props so neither reaches the client bundle
- `lib/queries/activities.ts`, `lib/queries/stickers.ts` — both wrapped in React `cache()`

**State:** `tsc`, `eslint`, 195 tests, `npm run build` all green — the build prints `✓ viewTransition` under its experiments. Confirmed in the compiled CSS: `@keyframes land`, `@keyframes deck-slide`, `.animate-land`, `.data-open:duration-[var(--dur-panel-in)]` resolving to `--tw-duration: var(--dur-panel-in)`, `.data-open:ease-enter` resolving to the literal curve, all four `::view-transition-*(.deck-*)` rules, and the reduced-motion `:root` block emitted *after* the base one. Uncommitted.

**What to look for.** Open the day modal — it should arrive noticeably slower than it leaves. Same for the mood popover, the area dropdown and the sticker form's select. Then press the month arrows: the grid should slide a little and cross-fade in the direction you pressed, the month name should fade without sliding, and the arrows shouldn't budge. Drop a sticker on a day and watch it scale into place; tick one in the day modal and check it does the same thing. Then turn on Reduce Motion in System Settings → Accessibility → Display and do all of it again — everything should still happen, instantly, with no dialog left stuck open.

**The skeletons need throttling to see**, because the queries come back too fast locally. DevTools → Network → throttle to "Slow 4G", then hard-reload: the nav and the page frame should paint immediately, with a grey six-row calendar and a grey rail under them, and no jump when the real one lands. Switch to Trends while it's still loading and you should get the Trends skeleton rather than a blank half-page.

**Open**

- **The skeletons haven't been looked at yet.** They need DevTools throttling to appear for longer than a frame, so they're the one part of this step the browser hasn't already settled.
- **The deck's snapshots aren't clipped.** A view-transition pseudo-element is attached to the document root, so for 340ms the outgoing month is painted over whatever is beside it. 8% should keep that inside the page's own margins, but "should" is doing the work.
- **Stepping a month remounts all 42 cells,** because the `<ViewTransition>` key changes. Fine today; worth knowing if a cell ever holds state you'd want to survive.
- **`animate-land` fires on a same-day reorder too,** since a `move` is a `move`. Arguably right — the mark did arrive somewhere — but it's a scale on an element that only shuffled two positions left.
- **The skeletons duplicate layout classes**, so a change to the calendar's or the Trends page's structure has to be made twice. The two numbers most likely to drift are imported rather than copied, which covers the silent failures; the rest would be obvious the first time you throttled.
- **The tray skeleton guesses three groups of three.** It's the shorter column on a wide screen so being a row out costs nothing, but on a phone the rail is stacked underneath and a wrong guess does move the page.
- **Deferred, still, and probably for good:** a cross-fade on the Calendar ↔ Trends tabs and animated chart lines on Trends. The no-fade experiment above is the argument against both — more motion isn't automatically better here, and neither of those is load-bearing.

## 2026-09-03 · Step 16, continued · A caret between the marks

"Let's also make it possible to rearrange stickers and be able to choose where to slot a sticker, and when a sticker is picked up from the drawer, have it just be the circle sticker (without the description), just like if you picked one up from the calendar." Scope confirmed as marks on a day, not the tray's own order. Insert cue: "A line between stickers to show inserting between them, kinda like in a text field."

**Decisions**

- **The gaps between marks are droppables; the marks aren't.** The alternative was to register each mark and then work out from the pointer whether you meant before it or after it — pointer coordinates, the mark's rect, a midpoint test, all in the drop handler. Registering the gaps means dnd-kit's own hit-testing hands back an index directly, and the thing that gets *found* is the same thing that gets *drawn*.
- **A caret slot has zero width.** Four carets at 2px each would take a whole mark's worth of space back out of the 85px row we spent Step 16 fitting. The box occupies nothing; the 2px line is painted absolutely over the 2px gap that's already there. The side effect is the design Stephanie asked for — aiming at a gap doesn't make the gap open, the same way a text caret doesn't push the letters apart.
- **Collision detection asks two questions, not one.** `pointerWithin` over cells only ("which day"), then nearest-centre among that day's slots ("where in it"). One pass over everything would happily return a slot in the cell next door when the cursor sat in a margin.
- **Vertical distance counts quadruple.** A day's marks wrap; 30px of line height is small next to 85px of width, so plain distance lets the last gap on the line above win while the cursor is clearly on the line below.
- **`position integer`, dense 0..n-1, no fractional gaps.** The clever version stores 0/100/200 and inserts by averaging, so a reorder is one UPDATE. It's right at a scale this table will never see: a day holds a handful of marks, renumbering all of them is one round trip either way, and halving intervals eventually needs a rebalance pass nobody remembers to write.
- **No unique constraint on `(user_id, day, position)`.** A non-deferrable unique index checks per row, so a swap trips over itself halfway through even though the final state is valid. The query orders by `position` *then* `created_at` for exactly that reason — with ties possible, one key isn't a total sort, and a day would quietly reshuffle between page loads.
- **A same-day drop is a `move`, not a new `reorder` variant.** Every caller builds the same thing either way; the gesture is identical and the cursor decides which one it was. A separate variant would make the drag handler branch on a distinction the user never makes.
- **The index is read against the day as it's drawn, dragged mark included.** So a slot to the right of where the mark started counts one position that's about to stop existing, and both `applyChange` and the action subtract it. They have to agree, or the optimistic draw and the row that comes back differ by one.
- **Both carets touching a mark mean "leave it alone".** That's how a drag gets abandoned — pick it up, think better of it, put it down. Same Map back, and the action skips the round trip too.
- **`index` is required, not optional.** An optional one would make "the end" the silent default, and the point of the field is that the caller looked. The day modal's checkbox says `stickers.activities.length` out loud.
- **The overlay lost its card.** It was a copy of the tray row, which was right while the tray was the only drag source. Once marks could be lifted off the calendar it was drawing a labelled card in place of a 26px circle four times smaller — and a wide box under a cursor is a lie about where the cursor is, which is what forced `pointerWithin` in the first place. The three states survive without the border: full strength + shadow over a day, pale outside, pale + a red ring when letting go would delete.
- **Shrinking the overlay meant re-anchoring it (bug, found and fixed).** Stephanie: "If I pull up a sticker for a day and then try to pull up the same sticker for a different day, the sticker doesn't pull up at all." dnd-kit sizes and positions the overlay from the box you picked *from* — a 288px tray row — and the new 26px circle sat at that box's left edge. Grab a row by its name and the mark lifts a hand's width to the left of your cursor, which reads as nothing lifting at all. Fixed with `width/height: max-content` on the overlay plus a `snapToCursor` modifier that centres it on the pointer. A mark lifted off the calendar is already 26px and already grabbed near its middle, so the same rule moves it a pixel or two and the two drags finally are the same gesture.
- **The cell's drop highlight is a prop now, not `useDroppable`'s `isOver`.** On a pointer drag `over` is a slot *inside* the cell, so the cell's own `isOver` is false — the square would go dark the moment the drop got more precise.

**Changed**

- `supabase/migrations/20260903120000_day_activity_position.sql` — new: `position` column, backfill by `created_at`, index on `(user_id, day, position)`
- `lib/database.types.ts` — `position` added to `day_activities` by hand, to match what `npm run types:db` will generate
- `lib/queries/stickers.ts` — `.order("position").order("created_at")`
- `lib/changes.ts` — `index` on `place` and `move`; `spliced()` with its clamp; `moveSticker` handles `from === to`
- `lib/changes.test.ts` — 7 new tests (caret slot, clamping, four reorder cases)
- `app/actions/stickers.ts` — `placeActivity`/`moveActivity` take an index; `readDay` + `writeOrder` helpers; the `23505` fallback became an ordinary branch off the read
- `components/dnd/DropSlot.tsx`, `components/dnd/dropTarget.ts`, `components/dnd/snapToCursor.ts` — new
- `components/dnd/CalendarBoard.tsx` — two-stage collision detection; `overDay` boolean → `target: DropTarget | null`; bare-circle overlay, shrunk to `max-content` and snapped to the cursor; announcements read the day through `readDropTarget`
- `components/calendar/DayCell.tsx`, `MonthGrid.tsx`, `DayModal.tsx` — slots interleaved with marks; `over` and `caretIndex` passed down; the modal names its index

**State:** `tsc`, `eslint`, 195 tests, `npm run build` all green. `w-0`, `h-[26px]`, `-left-px`, `w-0.5`, `opacity-50`, `ring-2`, `ring-ramp-red` and `drop-shadow-md` all present in the compiled CSS. Uncommitted. The drag itself has now been exercised in the browser — that's how the overlay anchoring came out.

**What to look for.** Pick up a mark and move it along its own day — a thin line should appear in the gap you're aiming at, without the marks shifting. Drag one from the tray into the middle of a busy day. Check the thing under the cursor is a plain circle in all cases, that it goes pale off the grid, and that a mark lifted off a day gets a red ring out there.

**Open**

- **The types haven't been regenerated.** The migration is applied — `position` is on the table and the backfill ran — but `lib/database.types.ts` was edited by hand so the build would pass. `npm run types:db` should produce the same three lines.
- **Keyboard drags can't choose a slot.** No cursor means no gaps to aim at, so `readDropTarget` reads a bare cell as the end of the day. Honest, but it means reordering is a pointer-only gesture.
- **~200 slot droppables in a busy month,** all measured on drag start. Not noticeably slow, but it's the number to watch if a drag ever feels heavy.
- **The caret is `bg-ink` at 2px.** Unverified against the highlight wash and against a sunken out-of-month cell.

## 2026-09-03 · Step 16, continued · Header, then the marks, and the pencil takes a slot

"The stickers should be able to fill the third column (like where the mood and the pencil are) and the bottom column." Then, after looking at it: "I don't want stickers between the date and the mood, in the top row. I want it more like header [number space mood] then stickers, with edit taking one sticker's spot in the last row. Make sure there is some breathing room between header and the list of stickers too."

**Decisions**

- **The gap went `mr-1` → `mr-0.5`, and that alone was the "third column".** The cell's inner width is ~85px (744px of calendar over seven columns, less `p-2.5`). Three 26px marks with 4px gaps is 86px — one pixel over, so the row broke at two and the right-hand column of every cell stayed empty. Two-pixel gaps make it 82. A rounding loss that read as a design decision.
- **Row spacing comes from `leading-[30px]`, not margin.** The marks are inline-blocks now, and a vertical margin on an inline-level box does nothing to the line box around it. 26px of mark plus 4px of air, matching the horizontal rhythm.
- **The top line is a header and stays one.** Marks briefly wrapped *around* the date and the mood using floats — the one layout mode that can do that — and it was the wrong thing to want. "This is the 20th, and the day felt like this" is a pair; a sticker landing between them turns a label into a shelf. It bought one mark of capacity and cost the cell its structure. Backed out; the header is `flex justify-between` again.
- **`mt-2` between the header and the marks.** Without it the date, the mood and the marks are one undifferentiated pile, and the header stops reading as a header.
- **The pencil holds the last slot in the run instead of floating over the corner.** Absolutely positioned it sat on top of whatever mark reached the bottom right — and a mark you can't see is a mark you can't pick up. In the flow it can never overlap. It costs one sticker's worth of room on a busy day and nothing at all on a quiet one, which is most of them.
- **That also retires `pb-6` and the background chip.** Both existed only to manage the overlap. Reserving a real slot is the thing that made them unnecessary, which is the usual shape: the fix removes the workarounds rather than tuning them.
- **`opacity-0`, not `hidden`.** The slot has to stay held whether or not the pencil is showing — a control that appears and reflows the row it's in is worse than one that was always visible.
- **Capacity:** the min-height held 2 marks before the row grew. It now holds 5 — a row of three, then two more beside the pencil.

**Changed**

- `components/calendar/DayCell.tsx` — header row restored; the mark list is inline flow with `mt-2 leading-[30px] [&>button]:mr-0.5 [&>button]:align-top`; the pencil moved inside that list as its last child and lost `absolute`, `bg-*` and `border-hairline`

**State:** `tsc`, `eslint`, 188 tests, `npm run build` all green. `mt-2`, `leading-[30px]`, `mr-0.5` and `align-top` all present in the compiled CSS. Uncommitted.

**What to look for.** A busy day: date and mood on their own line, a clear gap, then a row of three marks and a second row that ends in the pencil. Hover it and check the pencil appears without anything moving.

**Open**

- **Three marks per row has ~3px of slack.** 82px of marks in 85px of cell. Any change to the rail width, the page width, or the mark size takes the third column away again, silently. The kind of number that should probably be derived rather than typed.
- **With exactly three marks the pencil starts a second row on its own.** Predictable, but it means a three-sticker day is as tall as a five-sticker one.
- A dead `color: 0` rule reached the bundle from a code *comment* explaining a utility that hadn't worked. Tailwind scans source text — comments included, and `.md` files too, so writing the class name into `learning/README.md` put it straight back. Both reworded to describe the class rather than spell it. A class name written in prose still ships.

## 2026-09-02 · Step 16, continued · Two columns that start and end together

"I'd like the 'Exercise was the greatest share…' to start higher on the right column, more in line with where the filter dropdown is. It feels unreasonably low right now. And call it 'Moods this month', and try to have both columns end roughly at the same place by removing spacing has necessary."

**Decisions**

- **The full-width header band is gone; the controls moved into the left column.** Both columns already started on the same grid line — the band above them is what made that line low. Its right half held nothing, and everything under it started below it, so the sentence (the page's actual answer) began a control row beneath the furniture that filters it.
- **Stephanie picked this over the alternative,** which was leaving the band and giving the right column a heading of its own to fill the same vertical space. That would have equalised the tops by adding, not removing.
- **The known cost:** the range picker governs both columns but now sits in one of them. It holds up only because nothing on this page escapes the range — one rule, one set of numbers. If a control ever filtered half the page, the band comes back.
- **The right column is the one that can give.** The chart card is a fixed aspect ratio, so its height follows the column's width and can't be stretched to meet anything. The readout is a sentence, a table and a strip — all stretchy. A mismatch where only one side can move isn't a bug to fix, it's a length to choose.
- **The space came from the biggest multiplier, not the biggest number.** Table rows `py-2.5` → `py-2` is 4px on eight rows ≈ 32px; the readout's `gap-8` → `gap-6` is 8px on two gaps = 16px; the mood heading's gap gives 4px. The change nobody notices moved twice what the obvious one did.
- **One horizontal change bought vertical space.** The mood strip's `gap-x-6` → `gap-x-5` is 16px of width across four gaps, which is roughly what the five items needed to stop wrapping. A row that fits on one line is a line shorter.
- **"Moods this month", plural.** Singular read as a label for a single value — *the* month's mood — when the strip is five counts and the zeros are part of the answer. `phrase` is still computed once in `TrendsBoard` and shared with the takeaway sentence.
- **`items-start` stays and is load-bearing.** Without it the grid stretches both columns to the taller one, and the fixed-ratio chart card is pulled out of shape by however long the table happens to be — which would turn this whole exercise inside out.

**Changed**

- `components/trends/TrendsBoard.tsx` — `<header>` removed; `RangePicker`, the span dates and `ChartSwitcher` now live in the left grid column; the empty state sits beside them instead of spanning both
- `components/trends/Readout.tsx` — wrapper `gap-8` → `gap-6`; `MoodStrip` heading is "Moods {phrase}"; section `gap-4` → `gap-3`; strip `gap-x-6` → `gap-x-5`
- `components/trends/AreaTable.tsx` — every `py-2.5` → `py-2`

**State:** `tsc`, `eslint`, 188 tests, `npm run build` all green. `gap-x-5`, `gap-6`, `gap-3`, `py-2`, `gap-x-14`, `gap-y-10` confirmed in the compiled CSS. Uncommitted.

**What to look for.** Open Trends. The sentence should start on the same line as the dropdown, not below the chart pill. Then look at the two columns' bottoms — the mood strip should finish within about a line of the chart card.

**Open**

- The column heights are estimates from the type scale, not measured in a browser. "Roughly" is doing real work: six areas and five moods on one row is the common case, and a range with fewer of either ends higher.
- Below `lg` the columns stack and none of this applies — unlooked-at.
- Whether the mood strip actually fits on one line at this column width is the one thing `gap-x-5` was chosen for and the one thing that hasn't been seen.

## 2026-09-02 · Step 16, continued · A narrower page, and the last half pixel

"Let's increase the left and right margin (decrease the width and center the column all the content sits on a bit), and apply the fix for the emoji centering."

**Decisions**

- **Both numbers in `PAGE_WIDTH` moved, because they bind at different sizes.** `max-w-*` is what stops the content on a wide screen and the gutter is the leftover; on a laptop the max-width never applies and `px-*` *is* the margin. Changing one widens the page in half the windows it's viewed in. Now `max-w-6xl px-10`, was `max-w-7xl px-8`.
- **The calendar grid gives up the 8rem.** 7xl was picked so the grid kept roughly its pre-rail width. A month is a fixed 7 columns — it doesn't need the width, it fills whatever it's given — so the margin is the better owner of it.
- **One constant, so the nav and the page body can't drift.** The wordmark sits directly above the calendar's left edge; that alignment is the entire reason `PAGE_WIDTH` exists rather than being written twice.
- **The emoji nudge is `translate-y-[0.5px]`, and it stays a magic number.** Naming the emoji font first fixed *which* box the glyph is centred in. It can't fix that a box isn't ink: what gets centred is ascent-plus-descent, and an emoji font reserves descent its glyphs barely use, so the box's midpoint sits below the ink's. There is no `align-items: optical`.
- **It works because the glyph span is a grid item.** `translate` doesn't apply to non-replaced inline elements — but a direct child of a `grid` container is blockified, so it does. Confirmed in the compiled CSS: Tailwind v4 emits the `translate` property, not a `transform`.

**Changed**

- `lib/layout.ts` — `PAGE_WIDTH` is `mx-auto w-full max-w-6xl px-10`
- `components/calendar/StickerMark.tsx` — `translate-y-[0.5px]` on the glyph span

**State:** `tsc`, `eslint`, 188 tests, `npm run build` all green. `max-w-6xl`, `px-10` and `translate-y-[0.5px]` confirmed in the compiled CSS. Uncommitted.

**What to look for.** More air either side of the whole page, nav included — the wordmark should still line up with the calendar's left edge. Then the book sticker: dead centre, or a hair either way, which is the number to tune.

**Open**

- The 0.5px was chosen by reasoning, not by looking. It's the right *direction*; the magnitude is a guess until someone sees it.
- Letter marks (`✎`) take the same strut and move with it. Whether that's an improvement or a new problem is unlooked-at.

---

## 2026-09-02 · Step 16, continued · The mood row, and the mood popover

Two from Stephanie, plus a question about the book emoji. "Let's put the moods (if there is enough width) on one row, with the labels below, so they take up less vertical space." Then: "Clicking on a mood on the calendar should bring up an option to just change the mood and nothing else."

**Decisions**

- **The moods are five columns, not five rows.** `grid grid-cols-5`, face over label, `col-span-full` so the stacked layout gives them the page width rather than one cell of it. Saves about 120px of rail, which the six life areas get.
- **Fixed columns, not `flex-wrap`.** Wrapping breaks 4 + 1 at the first width that doesn't fit, and a lone "Rough" on its own line reads as a different kind of thing. Equal columns just narrow; the longest label is five characters.
- **`MoodPicker` is its own component, not `TrayGroup` with a prop.** Same argument `ArchivedRow` settled: no eye, no editor, no hover band, no name beside the face — a `variant` would be switching off nearly all of `TrayRow` and then relaying it vertically. What they still share is `DragPayload`.
- **Clicking a mood in the tray now lights it.** A sticker row has three verbs, so the third (highlight) needs its own control — that's the eye. A mood has two, and its body's click did nothing at all. Handing that click to the highlight is what lets the eye go, which is what makes five columns fit.
- **`TrayGroup.onSelect` stopped being optional.** The moods were the only caller that omitted it, and the component carried a whole second heading branch for that case. An optional prop nothing omits is a branch you can't check by using the app.
- **The mood on a day is a popover, not the modal.** A mood is the one field on a day you *revise*, and opening a dialog with fifteen sticker checkboxes to move one value one notch is the wrong weight. A popover is anchored to the face, closes on Escape or an outside click, and leaves the month visible while you decide.
- **It exists only where a mood already does.** Hanging the trigger off the face means an empty day has no trigger; adding a day's first mood is still the pencil's job. The alternative was 42 permanent empty circles, which would make the empty days look like unfinished ones.
- **"Clear mood" is in the popover.** Same reason the modal has it: most days have no mood, so "none" is a state you must be able to get back to.

**Changed**

- `components/tray/MoodPicker.tsx` — new; the five moods as a row of columns
- `components/tray/StickerTray.tsx` — the `TrayGroup`/`TrayRow` mood block replaced by it
- `components/tray/TrayGroup.tsx` — `onSelect`/`selected`/`wash` required; the headingless branch gone
- `components/calendar/DayMoodButton.tsx` — new; the face as a popover trigger
- `components/calendar/DayCell.tsx` — the mood `<span>` became that button; takes `onCommit`
- `components/calendar/MonthGrid.tsx` + `components/dnd/CalendarBoard.tsx` — `onCommit` threaded through to the cells

**State:** `tsc`, `eslint`, 188 tests, `npm run build` all green. `grid-cols-5` confirmed in the compiled CSS. Uncommitted.

**What to look for.** The tray: one row of five faces with words under them, and clicking one lights its days (no eye any more). The calendar: click any face, get a small panel of five faces and "Clear mood", pick one, it changes with the panel closing behind it.

**Open**

- ~~The book emoji still sits high.~~ Applied in the entry above.
- A day with no mood has no mood control. Only the pencil adds the first one.
- The mood popover has no error path of its own — a failed write surfaces in the tray's line at the bottom of the rail, which may be off screen.

---

## 2026-09-02 · Step 16, continued · The cell stops being a button

Stephanie, after the restyle: "Let's not make the entire calendar section clickable. instead the highlight still happens, but you can actually move stickers around (and move them off the calendar to delete them), and there's a tiny edit button that pops up at the bottom right of that calendar square to edit manually."

**Decisions**

- **The cell is a `<div>` again, and the pencil is the only control in it.** A whole-cell button spent the interaction budget of everything inside it — HTML forbids a control inside a control, so for as long as the cell was a button, every mark in it could only be a picture. The click target shrank from 150px square to 24px, and the calendar gained two gestures for it.
- **The pencil reveals on hover, behind `@media (hover: hover)`.** Second time this project has needed that guard. A touch screen never fires hover, so an `opacity-0` lifted only by `:hover` is a target you can't see and can still hit; on a phone all 42 are just visible.
- **The cell's long `aria-label` is gone and one line of it survives as `sr-only`.** "20 August. Gym, Meditation. feeling Great" existed because a control full of drawings had to name itself. Now each thing names itself — the `<time>`, each mark ("Gym, 20 August"), the pencil ("Edit 20 August"). The exception is the highlight, which is pure tint and had no element to live in. A feature made of colour doesn't exist for a screen reader, so deleting the label would have deleted the feature.
- **A move is one `UPDATE`, not a delete and an insert.** The row exists and only its `day` is wrong. Updating keeps `day_activities.id`, so React moves the circle instead of unmounting one and mounting another — and it can't half-fail across two round trips. `applyChange` mirrors it exactly: it carries the existing sticker object across rather than minting a `pending:` id.
- **`UPDATE` is the statement RLS filters rather than rejects.** Not-yours rows fall out of scope and Postgres reports success on zero rows. `.select("id")` plus a length check is the only tell — same trap `updateActivity` documents.
- **`23505` on a move is a merge, not an error.** Dragging Monday's Gym onto a Tuesday that already has Gym has nowhere to land, so the conflict falls through to deleting the source row. That's what the optimistic redraw already drew.
- **Dropping outside means two different things now, and only paint says which.** Cancel from the tray, delete from a day. The overlay's dashed border goes red for the second — same box, same width, same opacity, only the hue moves, because the card is under a cursor that's aiming and must not change size. The announcements split the same way ("let go to take it off 20 August" vs "let go to cancel"), which is the one place words are still right.
- **Each mark is a `<button>` keyed by its placement id.** `useDraggable` hands back `tabIndex`, `role` and key listeners that do nothing on a `<span>`; the cost is one tab stop per mark. The id is the placement, not the activity, because two days holding Gym would otherwise register the same id twice in one `DndContext`.
- **Clicking a mark does nothing, on purpose.** Its body is a drag handle. A thing you can both grab and press is a thing where a press is a coin flip.

**Changed**

- `components/calendar/DayCell.tsx` — `<div class="group/day">`, `DraggableMark` per sticker, hover-revealed pencil, `dayLabel()` deleted, `sr-only` highlight line
- `components/dnd/DraggableMark.tsx` — new; a placed mark as a draggable button
- `components/dnd/payload.ts` — optional `from` on the activity branch
- `components/dnd/CalendarBoard.tsx` — four-way `handleDragEnd`, `move` in `runChange`, `leaving` overlay state, origin-aware announcements
- `app/actions/stickers.ts` — `moveActivity`
- `lib/changes.ts` + `lib/changes.test.ts` — the `move` change and six tests for it
- `learning/README.md` — card, seven symptom rows, two stale `Where` pointers corrected

**State:** `tsc`, `eslint`, 188 tests, `npm run build` all green. `group-hover/day`, the `hover:hover` guard and `border-ramp-red` confirmed in the compiled CSS. Uncommitted.

**What to look for.** Drag a mark from one day to another — it should move, not duplicate. Drag one onto a day that already has it: the source loses it, the target keeps one. Drag one out over the tray: the card goes red-dashed and the mark comes off. Then hover a cell for the pencil, and check the tray drag still cancels grey.

**Open**

- Dropping outside is still one gesture with two meanings. Colour is the whole distinction, and it's untested on anyone but us.
- One tab stop per mark. A busy month is a long tab sequence with no way to skip it.
- Keyboard drag exists but has no way to say "off the calendar" — `closestCenter` always finds a day, so a keyboard user can move a mark but not delete one. The modal still can.
- Nothing here has been looked at in a browser.

## 2026-09-02 · Step 16, continued · The sticker gets an outline, and three lines go

Four from Stephanie in two messages. A lighter sticker fill with an outline in the area's colour, "since some of the emojis are hard to see against this strong background" — plus "for some reason the book emoji is also not centered in the sticker". Then: remove "Let go to cancel", remove the "4 marks in all, across 2 of your 6 areas" line on Trends, and put the moods at the top of the tray.

**Decisions**

- **The fill dropped to a new `-tint` rung and the hue moved to a 1px border.** 20% of the hue over the surface, against the soft rung's 48%. The mark is `--ink` and always cleared contrast on the old fill — the marks that didn't are the ones this app can't recolour. An emoji brings its own palette, and a mid-tone circle competes with all of it. **A fill and the thing drawn on it want the same pixels; an outline doesn't.**
- **A third solid token, not `bg-ramp-red-soft/40`.** A sticker sits on `--surface` in the tray and on a sunken cell in the grid; a translucent fill would be two different colours in the two places.
- **It's the one rung where both themes use the same number.** The `-soft` pair are 48%/42% because mixing *toward* the hue brightens one theme and darkens the other. Mixing *less* moves each toward its own surface, which adds contrast under the mark in both at once. Floor is 8.5:1 (dark yellow); the light theme is 12.8:1 or better.
- **The book emoji was a font-metrics bug, not a layout one.** A line box takes its height and baseline from the **first available font** — the first family installed, whether or not it has the character. The mark was set in the body serif, so the box came from EB Garamond while the ink came from Apple Color Emoji. `place-items-center` centred the box perfectly and the glyph hung low inside it. Fixed with a `--font-emoji` stack that names the emoji families first, so box and ink share one set of metrics. The serif stays at the end for marks that are letters.
- **"Let go to cancel" was one thing too many to read mid-gesture.** Written a day ago as the part that "turns a dead zone into a way out" — but the dashed, translucent card is that part, and it lands without being parsed. The overlay lost its `relative` wrapper with it and went back to being one box.
- **The sentence survives in the drag announcement.** There's no dashed border to see there. The two channels only had to agree while both were the only way in.
- **The Trends support line was a second copy of the table under it.** `takeaway` now returns a `string` rather than a `{ lead, support }`, so the `Takeaway` type and the singular/plural mark counting went with it — along with the one test that only asserted `support`.
- **Moods went to the top of the tray.** The old order was "what you own, then what ships with the app". The new one matches how a day gets filled in: how it felt, then what you did. Being fixed by the CHECK constraint is what makes it a good first group — it's the one list in the rail that never changes shape.

**Changed**

- `app/globals.css` — `--font-emoji`; the `--ramp-*-tint` rung in both themes
- `lib/palette.ts` — `tint` on all six ramps
- `components/calendar/StickerMark.tsx` — tint fill, full-hue border, `font-emoji` on the glyph
- `components/dnd/CalendarBoard.tsx` — the cancel line and its wrapper removed
- `lib/analytics.ts` + `lib/analytics.test.ts` — `takeaway` returns a string; `support` gone
- `components/trends/Readout.tsx` — one `<p>` instead of two
- `components/tray/StickerTray.tsx` — the mood group moved above the areas
- `learning/README.md` — card and five symptom rows

**State:** `tsc`, `eslint`, 182 tests, `npm run build` all green. `bg-ramp-*-tint`, `border-ramp-*` and `font-emoji` confirmed in the compiled CSS. Uncommitted.

**What to look for.** Every sticker, in all four places it's drawn: pale circle, coloured ring, emoji you can actually read. Check the book one specifically — it should sit dead centre now. Then Trends (one sentence, no totals line under it), a drag off the calendar (dashed card, no caption), and the tray (Mood first).

**Open**

- **Yellow's ring is faint against its own fill** — 1.67:1, where the other five are 3.2–3.7:1. Yellow is a low-contrast hue against cream generally; the ring's real job is separating the sticker from the page, which it still does. Worth an eye on the Creativity & Play stickers.
- **Letter marks now get the emoji font's metrics too**, since the strut comes from the first available family regardless of what draws the glyph. Apple Color Emoji has no Latin, so a "G" still renders in the serif — but its vertical position may have shifted slightly. Nothing in the seed uses a letter; `✎` does.
- **Still unlooked-at in a browser**, five changes deep.

---

## 2026-09-01 · Step 16, continued · Dropping outside, and a `+` per area

Two more from Stephanie, an hour apart: dropping a sticker outside the calendar was landing it on a border square anyway ("i dont like that — let dropping outside the calendar be a 'ditch this action' affordance"), and each life area should get its own `+` that opens the create dialog already set to that area.

**Decisions**

- **The collision fallback was the bug, and it was hiding in a sentence that sounded right.** `collisionDetection` was `pointerWithin`, falling through to `closestCenter` whenever it came back empty. Written as "cover the keyboard case too" — and `pointerWithin` also returns empty every single time the cursor is outside the grid, so the fallback fired there too and handed back the nearest square. Release over the tray, the page margin, the month header: it landed on a border cell. **A fallback keyed on "the first strategy found nothing" answers a different question from "the first strategy doesn't apply here"**, and the two coincide often enough to look correct.
- **The discriminator is `pointerCoordinates`, and it was read rather than guessed.** dnd-kit derives it from the activator event's `clientX`/`clientY` via `getEventCoordinates`, and a `KeyboardEvent` has neither, so it's null for keyboard drags and only for those. Verified in `@dnd-kit/utilities`. The branch is now "is there a pointer at all" instead of "did the pointer find anything", and an empty `pointerWithin` finally means what it says.
- **`handleDragEnd` needed no change.** It already returned early on a null `over` — the check had simply never been reachable with a mouse. Two lines of comment there had been describing behaviour that couldn't happen.
- **Cancelling is stated, not just permitted.** Making the drop a no-op is the correctness half; on its own it's a dead zone, and a dead zone and a broken app feel the same. Outside the grid the overlay goes translucent, loses its shadow and turns its border dashed — placeholder vocabulary, meaning nothing here will land — and a small line reads **"Let go to cancel"**. The screen-reader announcement gained the same three words.
- **The cue is absolutely positioned under the card, not appended inside it.** The overlay is `w-fit` and sits under the cursor; adding a few words inline would widen it, so it would jump sideways at the exact moment you cross the grid's edge — which is the moment it most needs to hold still. Paint changes, geometry doesn't.
- **`overDay` is a boolean mirrored out of dnd-kit, not the over id.** `DragOverlay`'s children aren't handed `over`, so it has to be lifted. Which day is already answered by that day lighting up underneath.
- **`onDragStart` sets `overDay` false explicitly.** `onDragOver` fires on *changes*, so a drag that starts and ends outside the grid never fires it once — leaving the flag on whatever the last drag ended as.
- **The per-area `+` is `NewStickerForm` with one extra prop, not a second component.** `defaultAreaId` seeds the dropdown. It's a starting value and not a lock — the dropdown still works, because this is a shortcut through one field rather than a different form.
- **And it broke `StickerFields`'s "am I moving past marks" rule, which is the interesting part.** That warning was gated on `initial.lifeAreaId !== ""`, documented as self-answering: only an edit arrives with an area already chosen, so no `mode` prop was needed. A create that opens pre-filled is precisely the case that assumption excluded, and the symptom would have been a brand-new sticker warning you that its nonexistent past marks would move. Replaced with an explicit `historyArea`, which is still not a mode flag — it's a value, only the edit dialog has one, and it names the thing the sentence is actually about. **A self-answering condition is an inference, and it stays correct exactly as long as nobody adds the case it inferred from.**
- **The heading's `+` sits between the label and the eye**, so the eye stays on the same right-hand line every row in the tray puts it on. It's `icon-xs` ghost to match, and it fades in on hover off the same `group/row`. The header's `+` keeps its outline and stays always-visible — hiding the one unconditional way to add a sticker behind a hover would be hiding the feature.
- **The dialog says which area it's making a sticker in** ("A mark and a name, in Health."), because the button you pressed was the one on Health and the dialog should agree with it.

**Changed**

- `components/dnd/CalendarBoard.tsx` — collision detection rewritten; `overDay`; the overlay's two states and the cancel cue; announcement
- `components/tray/NewStickerForm.tsx` — `defaultAreaId`, heading-sized ghost trigger, area-aware label and description
- `components/tray/StickerFields.tsx` — `historyArea` replaces the derived `moving` test
- `components/tray/EditStickerForm.tsx` — passes `historyArea`
- `components/tray/TrayGroup.tsx` — heading `action` slot
- `components/tray/StickerTray.tsx` — a `+` per life area
- `learning/README.md` — card and four symptom rows

**State:** `tsc`, `eslint`, 183 tests, `npm run build` all green; `border-dashed`, `top-full`, `whitespace-nowrap`, `opacity-60` confirmed in the compiled CSS. Uncommitted.

**Note to self about the checks:** one round of these was run from inside `node_modules/@dnd-kit/core/dist`, because `cd` in a shell command persists between calls. `tsc` and `eslint` both exited 0 having looked at nothing. Re-run from the repo root, everything genuinely passes — but a green check from the wrong directory is worse than a red one.

**What to look for.** Pick up a sticker and move it off the calendar: the card goes translucent with a dashed edge and "Let go to cancel" appears under it, and letting go there does nothing at all. Over a day it goes solid again. Then hover any life-area heading: a `+` appears beside the eye, and it opens the create dialog with that area already chosen and the subtitle naming it. Change the dropdown while you're in there — no warning about past marks, because there aren't any.

**Open**

- **Still unlooked-at in a browser**, now four changes deep.
- **The cue sits below the card**, which puts it near the bottom of the viewport if you drag to the very bottom of the window. It may want to flip above the card there.
- **Keyboard drags keep `closestCenter` and can't be "outside"**, so there's no keyboard equivalent of this cancel other than Escape. That's probably right, but it means the two input methods now have different ways out.

---

## 2026-09-01 · Step 16, continued · Swapping the row's two meanings

Stephanie's call, straight after archiving landed: "clicking on a sticker brings up the edit page, and then on the right there's an interaction that signals that it will highlight this sticker everywhere." Both halves are in.

**Decisions**

- **The row body opens the editor; an eye at the right edge lights the days.** Exactly the reverse of Step 11 + 16. The reason it's the better way round: a click on a thing with a name conventionally opens that thing, and highlighting was the meaning nothing announced — it was a feature made entirely of its own result, discoverable only by clicking a row and noticing the calendar change. **The interaction that needs a control is the one with no natural gesture, not the one with an obvious one.**
- **The pencil is gone.** This is the payoff and it wasn't obvious in advance: the swap looked like it would add a control, and it removed one. Fifteen rows now carry one button instead of two, so the rail is less crowded than before the change, not more.
- **Eye / eye-off, from four options offered.** The eye is the only one of the four that everybody already reads as "show me this", and swapping to eye-off while lit gives the *on* state its own icon rather than making the row's wash the sole indicator.
- **Stable accessible name plus `aria-pressed`, not a label that changes.** "Show Gym's days" whether it's on or off; `aria-pressed` carries the state. Changing the label to "Stop showing…" would say the state twice, once through the name and once through the attribute, and those two are easy to get pointing in opposite directions. The icon swap is the sighted half of the same split.
- **Every row and every area heading gets the same eye — including the headings.** So the rule is airtight: the body opens, the right edge highlights. The cost is that the area heading stopped being a giant click target and went back to a plain `<h3>`, which is also a small win: it's a heading again, a landmark for anyone navigating by headings, with no hover tint implying a click that no longer happens.
- **The heading's eye is `icon-xs`, the rows' are `icon-sm`.** 1.5rem against 1.75rem. A heading is a 0.7rem eyebrow, so a row-sized button there would set the heading's height by itself and push the six areas further apart than the stickers inside them.
- **Mood rows get the eye and no `onActivate`.** There's nothing behind a mood to open — they're fixed by the CHECK constraint on `day_moods` — so their body is a drag handle and only that. It stays a focusable `<button>`, because that's what lets Space pick a mood up without a mouse.
- **`EditStickerForm` became one dialog for the whole tray instead of fifteen.** With the trigger gone it had no reason to exist per row. `StickerTray` holds `editing: string | null` and mounts exactly one. The id rather than the sticker object is deliberate: `refresh()` after a save hands down new groups, and a stored copy would keep showing the old name — and deleting a sticker now closes the dialog by itself, because the lookup stops finding anything to render.
- **The row's accessible name is "Edit Gym" while its visible text is "Gym".** Legal because the longer phrase contains the visible word — that's the Label in Name rule — and it's what keeps "click Gym" working for someone driving the page by voice.
- **The screen-reader instructions shrank back to dnd-kit's default.** Step 11 prepended "To highlight every day this appears on, press Enter", because that was the only way anyone without sight could find a feature made of colour and triggered by an unannounced key. The eye is a labelled toggle one Tab away, so the sentence had nothing left to teach. **Prose explaining an interaction is usually a control that hasn't been built yet.**
- **The `keyboardCodes` config needed no change at all.** Enter was already handed back to the row's button; it used to fire the highlight and now fires the editor. A swap of this size touching nothing in the sensor is the sign the seam was in the right place.
- **The archived fold was left alone.** No eye, no body click — it's a holding pen, not a working list, and adding two controls to a dimmed row you rarely open is noise. Consequence to watch: deleting an archived sticker still means restoring it first.

**Changed**

- `components/tray/HighlightToggle.tsx` — new; the eye
- `components/dnd/DraggableSticker.tsx` — `onSelect` → optional `onActivate`; `aria-pressed` out, `aria-label` in
- `components/tray/TrayGroup.tsx` — `TrayRow` renders the eye itself; the heading is a plain `<h3>` beside one
- `components/tray/StickerTray.tsx` — holds `editing`; mounts one `EditStickerForm`
- `components/tray/EditStickerForm.tsx` — controlled, no trigger, no pencil
- `components/dnd/CalendarBoard.tsx` — instructions trimmed; two stale comments corrected
- `learning/README.md` — Step 16 card extended, five new symptom rows

**State:** `tsc`, `eslint`, 183 tests, `npm run build` all green. Uncommitted.

**What to look for.** Hover a sticker: one eye fades in at the right edge, where the pencil used to be. Click the row itself and the edit dialog opens. Click the eye and its days light up, the eye turns to eye-off and stays visible with the row washed. Every area heading has the same eye, smaller. The five moods have one too, and clicking a mood's name does nothing — it only drags.

**Open**

- **Still not looked at in a browser** — this, archiving, and Steps 14–16 all at once.
- **Clicking a row now opens a dialog, and rows are also drag handles.** The 4px threshold has always separated the two, but a mis-registered drag used to cost you a stray highlight and now costs you a dialog. Worth feeling on a trackpad.
- **Two ways to clear remain** (the eye again, the header's "clear" link) plus Escape. That may be one too many now that the eye is visible.

---

## 2026-09-01 · Step 16, continued · Retiring a sticker

Asked for straight after editing landed, and in two halves an hour apart: first "we need to be able to archive stickers", then "stickers should also have an option to actually be deleted along with all their data, and not be able to be brought back or seen again". Both are in. They are deliberately not the same control.

**Decisions**

- **An archived sticker's past marks keep counting.** Stephanie's call, from three options. The marks stay on the calendar *and* keep counting under their life area in Trends — you stopped doing the habit, you didn't stop having done it, and a Trends page that quietly re-wrote April because you retired something in September would be lying about a month you can remember. The whole implementation follows from this one answer.
- **So `getStickerLibrary` stopped filtering, and every list now says which kind it wants.** The obvious version — `.eq("archived", false)` in the query — would have made archiving *also* mean "un-count the history", because `tally` reads an activity's area from the library and an activity that isn't in the library has no area. Instead the query returns everything with the flag attached, and the four consumers each answer for themselves: `tally` and `buildHighlight` want all of them, the tray splits them into two sections, and the day modal wants the active ones plus whatever is already on that day. Four different answers to "which stickers" is the cost of the decision above, and the query's doc comment lists them so the next person doesn't add a filter back.
- **The day modal's rule is `!archived || placed.has(id)`, and the second half is the load-bearing one.** An archived sticker can't be ticked onto a new day — that's what retiring means. But a mark you placed *before* retiring it is still sitting on the calendar, and the checkbox is the only control anywhere that can take it off. Hiding it outright would have stranded marks with no way to remove them. An area whose stickers are all archived and all unused drops out of the modal entirely, rather than showing a heading over an empty list.
- **Archive is one click; delete asks twice.** The asymmetry is the design. Archiving is reversible, so a confirmation would be a dialog protecting you from something you can undo — and restoring is the reverse of a reversible thing, so it needs one even less. Deleting is the only irreversible control in the app, and it's the only one that asks.
- **The delete confirmation replaces the row it's in.** "Archive · 🗑" becomes "Keep it · Delete forever", so the destructive button lands where a harmless one wasn't, and the pointer that was on Archive isn't already sitting on Delete. The warning itself goes *above* the fields rather than beside the buttons, so the thing meant to stop you is the width of the dialog instead of the width of a gap in a footer. It names the sticker and counts its marks: "Painting and its 12 marks", not "this item".
- **The mark count comes from the board, not a new query.** `CalendarBoard` is already holding every placement to draw the grid, so counting is one pass over a map that's already in memory. It's built from the *optimistic* map on purpose — a sticker you just dropped counts immediately, which is the number that matches what's on screen.
- **`confirming` lives in `EditStickerForm`, not in `StickerRetire`.** The confirmation shows up in two places — the warning over the fields and the buttons in the footer — so the flag belongs to the component containing both. Same lifting-up as the highlight in `CalendarBoard`, and for the same reason: two siblings needed one value.
- **`StickerFields` grew a `footerStart` slot rather than a `showDelete` prop.** Same argument that kept `mode` out of it in the first half of the step: the fields don't know whether they're creating or editing, and "is there a delete button" is exactly the question a mode flag would smuggle back in. A `ReactNode` in the footer is not the fields' business.
- **`ArchivedRow` is a new component, not `TrayRow` with `disabled`.** `TrayRow` *is* a `DraggableSticker` — dragging and highlighting aren't features it has, they're what it is — so a disabled version would be a component whose entire body is switched off by a flag. What's left when you remove them is a face, a name, and one button. The payoff is structural: there is no code path where an archived sticker can be dropped on a day, because the thing that does the dropping was never rendered.
- **The archived section is one fold at the bottom, not one per life area.** Six folds to open to find one sticker, when the reason you're looking is usually that you don't remember which area you put it in. They keep their area's colour, so the grouping still reads without being structural.
- **It's a native `<details>`.** Opens and closes with no JavaScript, is a disclosure to a screen reader with no ARIA at all, and find-in-page opens it to show a match inside — which no hand-built version does. It can't animate, which is the one thing it doesn't need. Closed by default: these are stickers you decided to stop seeing, and a fold that remembered being open would undo that decision on every reload.
- **`deleteActivity` and `setArchived` both ask for their rows back.** The Step 16 lesson, applied without being re-learned: under RLS a delete that matches nothing is not an error. `.select("id")` and a length check is the difference between "deleted" and "silently did nothing".
- **`day_activities` cascades, and that's what makes "along with all their data" true.** The FK was written `on delete cascade` back in Step 6, so deleting the activity takes every placement with it in one statement. Nothing in the app deletes placements by hand.
- **No optimistic update on restore.** Unlike a drop, restoring changes *where a row is* — from the fold at the bottom to its life area — not what it looks like. Faking that would mean rendering the row in two places for the length of a round trip.
- **The test fixtures now ship one archived sticker each.** `analytics.test.ts` retires Walk and `highlight.test.ts` retires Sleep, and every existing count and highlight expectation still includes them. That makes "archived marks keep counting" an assertion rather than a comment — the day someone filters `archived` out of the library, these break.

**Changed**

- `lib/queries/activities.ts` — `LibrarySticker.archived`; the query stopped filtering
- `app/actions/activities.ts` — `setArchived`, `deleteActivity`
- `components/tray/StickerRetire.tsx` — new; the archive/delete row and its warning
- `components/tray/RestoreStickerButton.tsx` — new
- `components/tray/EditStickerForm.tsx` — holds `confirming`, renders the warning, passes `footerStart`
- `components/tray/StickerFields.tsx` — `footerStart` slot in the dialog footer
- `components/tray/TrayGroup.tsx` — `ArchivedRow`
- `components/tray/StickerTray.tsx` — splits active from archived; the `<details>` fold
- `components/dnd/CalendarBoard.tsx` — `markCounts` from the optimistic map
- `components/calendar/DayModal.tsx` — `!archived || placed.has(id)`
- `lib/analytics.ts` — `unattributed`'s doc rewritten; archiving no longer the thing it's guarding against
- `lib/analytics.test.ts`, `lib/highlight.test.ts` — fixtures gained `archived`
- `learning/README.md` — Step 16 card extended, six new symptom rows

**State:** `tsc`, `eslint`, `npm test` (183 pass), and `npm run build` all green. `group-open/fold:rotate-90`, `opacity-55`, `col-span-full` and `sm:mr-auto` confirmed in the compiled CSS. Uncommitted.

**What to look for.** Open the pencil on any sticker: the footer now has **Archive** on the left and a trash icon beside it. Archive one and it drops out of its area into an **Archived (1)** fold at the bottom of the rail, dimmed, undraggable, with a restore button — and its old marks are still on the calendar and still in the Trends numbers. Open a day it's on: it's still listed and still tickable *off*. Open a day it isn't on: it's gone from the list. Then open the pencil again and hit the trash: the row turns into "Keep it · Delete forever" and a red line appears over the fields naming the sticker and its mark count. Confirm, and it and every mark it ever made are gone from the calendar.

**Open**

- **Nothing here has been looked at in a browser yet**, along with Steps 14, 15 and the first half of 16.
- **Archiving the last sticker in an area** leaves "Nothing here yet" under that heading, which is the empty state written for a brand-new area. It's not wrong, but it says the wrong thing about an area you've just emptied on purpose.
- **The fold is `col-span-full`**, so at the wide breakpoints it runs the width of the grid under all six areas. Worth seeing whether that reads as "below everything" or just as a stray wide row.

---

## 2026-08-31 · Step 16 · Editing a sticker

Inserted into the plan at Stephanie's request, after the app had real data in it — which is exactly when a typo in a sticker name starts to matter. Scoped to edit only: no archive, no life-area renaming, both of which were offered and declined.

**Decisions**

- **The pencil is its own control, not a second meaning on the row.** The tray row was already spoken for twice: it's a drag handle, and since Step 11 a click toggles highlight mode. A third meaning would have made all three ambiguous, and the one that suffers is the drag — telling "clicked" from "started to drag" is already a distance threshold rather than a certainty. The cost is one more tab stop per sticker, which is the right price. The alternatives most apps reach for — long-press, right-click — have no keyboard equivalent anyone discovers.
- **`StickerFields` moved to its own file the moment the second caller arrived.** Standing rule in this project, same as `firstGrapheme` in Step 10 and `lib/charts.ts` in Step 14. What makes the sharing honest here is that create and edit genuinely *are* the same form — same three inputs, same validator, same error mapping, same unique constraint to bump into. The tell is that the only differences left are two strings and a bound argument.
- **The action is a prop; there is no `mode` and no `if (editing)` anywhere in the fields.** `createActivity` takes `(formData)` and `updateActivity` takes `(activityId, formData)`, and reconciling those is the caller's business — it closes over the id and hands down one shape. A `mode: "new" | "edit"` prop would have put the same branch in four places inside one component.
- **`activityId` is an argument, not a hidden input.** A hidden field arrives in the same `FormData` as everything else, so `readDraft` would have to know about it and `validateDraft` would have to ignore it — and it isn't part of the draft. It's *which row to write*. Different question, different place.
- **The update asks for its rows back, and the insert doesn't.** This is the real lesson of the step. Under RLS, updating a row that isn't yours is not an error — the policy filters it out of the statement's scope and Postgres reports a successful update of nothing. Without `.select("id")` and a length check, "saved" and "silently did nothing" are the same response and the dialog closes on both.
- **`ERROR_ID` became `useId()`.** It was a module constant while there was one dialog that could only ever exist once. Two components generate it now, and a duplicate `id` in a document sends `aria-describedby` to whichever one the browser found first. The field ids are derived from it for the same reason.
- **Changing the life area shows a different sentence under the dropdown, and only once you've changed it.** Moving a sticker moves its whole history: `tally` reads an activity's area as it stands *now*, so last month's Trends page redraws. That was decided in Step 12 ("you reclassified the habit, not the days") and it's right, but nobody would guess it from a dropdown. It appears only when the value actually differs from where it started, because a warning about a thing you haven't done is noise the other 90% of the time. The check is self-answering — a new sticker starts with an empty `lifeAreaId`, so it can never fire during a create, which is why there's still no `mode` prop.
- **The preview does more work when editing than it ever did when creating.** Change the area and the circle changes colour before you commit to anything. On a create that's a nicety; on an edit it's the only way to see a recategorisation before it happens. *(Superseded — the preview panel came out later the same week and the mark field wears the colour instead. The behaviour described here survived; the second circle didn't. See "Step 16, revisited" at the top.)*
- **The pencil is visible by default and hidden only where hovering is possible.** `[@media(hover:hover)]` rather than a bare `opacity-0` + `group-hover`. On a touch screen there is no hover, so the plain version would leave an invisible tap target on every row.
- **The keyboard reveal is `focus-visible` on the pencil, not `focus-within` on the row.** The first attempt used `group-focus-within/row` and it was wrong on sight: the row is a button, clicking it turns highlight mode on, and focus then *stays* there — so every row you had ever lit kept its pencil showing after the pointer left. `focus-visible` on the button itself draws the line the row can't: a mouse click sets `:focus`, only a keyboard sets `:focus-visible`. Tabbing still works, because the pencil is the next tab stop after the row and reveals itself when focus arrives.
- **The emoji picker went from 48 hand-picked to all 1,914, in eight tabs.** The curated list was only friendly while the thing you wanted was in it; the moment it wasn't, the mark field quietly became letters-only, because typing an emoji means finding a system picker most people have never opened. `lib/emoji.ts` is generated from Unicode's own `emoji-test.txt` by `scripts/build-emoji.mjs` — fully-qualified rows only (the other two statuses are the same characters with the variation selector missing, so keeping them would show visible duplicates), no `Component` group, no skin-tone variants. 63KB of source, 17KB gzipped, checked in so a clean checkout doesn't need the network. Each button carries Unicode's name as `title` and `aria-label`, which is the only thing that makes 559 near-identical faces navigable.
- **Tabs are also what makes the popover open instantly.** Radix mounts one panel at a time, so it renders one tab's buttons rather than 1,914. The panel is a fixed height rather than one that fits the tab, because the tabs run from 85 emoji to 559 and a resizing panel would slide the tab strip out from under the pointer on every switch.
- **It took two failures to show 1,914 of anything in a popover, and both were about the edge of the list rather than the list.** First a scrolling 8×8 grid read as "not more than 200" — macOS hides its scrollbars until you're already scrolling, so a window onto a long list and a short list look identical when both are still. Then making the grid taller made it worse: a fixed-height scroller inside a popover inside a dialog has three ancestors that can run out of room, and when one did the list didn't scroll, it was simply cut off, with no scrollbar to say anything had been.
- **So there is no scroll container at all now — it's paged.** 9 × 6 = 54 per page, an explicitly-rowed grid built to hold exactly 54, and the same panel height on every tab and every page. Nothing can overflow it, so there is no edge to hide. What the scrollbar was failing to communicate is a sentence instead: **"559 · 1 / 11"** — how much there is, and where you are. The search box says the total in its placeholder for the same reason. This is the lesson worth keeping: a scrollbar is a *drawing* of the size of a list, and on a platform that hides it by default, the size has to be written down.
- **Explicit `grid-rows-6` plus a fixed height, so a half-full last page is the same size as a full one.** Without it the panel shrinks on the last page of every tab and the pager controls jump up to meet the pointer that was about to click them.
- **Unmounting is the page reset, twice over.** Radix mounts one tab panel at a time, so switching tabs starts at page one with no code; the search pager is keyed by the query, so a new search does the same. Same trick the dialogs use for their fields, and cheaper than an effect watching for changes to push the page back to zero.
- **Search matches on Unicode's names, which the data already carried for the tooltips.** Every word you type has to appear, so "flag japan" works and so does "japan flag". `found` is `null` while browsing and an array while searching — one value, not a second `mode` flag beside it, the same shape argument as `StickerFields`. Closing the popover clears the query, for the reason the dialogs unmount their fields: reopening onto a filtered picker with no visible cause is worse than starting over.
- **The group is named `group/row`.** The tray nests groups inside groups, and a bare `group-hover` binds to the nearest one — which would light every pencil in a life area at once.
- **`EditStickerForm` takes a `LibrarySticker`, and tsc caught the first attempt taking an `ActivitySticker`.** They both have an `id`, both describe the same circle, and they are not interchangeable: an `ActivitySticker` is a *placement*, whose `id` is the row on a particular day. Editing writes to `activities`, so it needs the library's id. Third time this exact confusion has come up — `lib/highlight.ts` documents it and `analytics.test.ts`'s fixtures are built so a mix-up can't pass.
- **`TrayRow` took a `ReactNode` slot, not an `onEdit` callback.** What goes in the slot owns a dialog. A callback would have meant the row also held the open state and rendered the dialog, and the tray would end up knowing about forms.
- **The six areas are built once in `StickerTray` rather than per row.** Fifteen rows, one list. It's the same list the `+` already needed, and the tray hands it down rather than the forms fetching it — two queries for one list is how a dropdown and the groups it describes end up disagreeing.

**Changed**

- `ProjectPlan.md` — Step 16 inserted at the end of Phase D; motion and deploy renumbered to 17 and 18
- `components/tray/StickerFields.tsx` — new; the shared form, extracted from `NewStickerForm`
- `components/tray/EmojiPicker.tsx` — new; all of Unicode's emoji behind eight tabs
- `lib/emoji.ts` — new; generated, 1,914 emoji with their Unicode names
- `scripts/build-emoji.mjs` — new; regenerates the above from unicode.org
- `components/ui/tabs.tsx` — new; shadcn, unmodified
- `components/tray/EditStickerForm.tsx` — new; the pencil and its dialog
- `components/tray/NewStickerForm.tsx` — trimmed to a trigger, a title, and an action
- `components/tray/TrayGroup.tsx` — `TrayRow` gained an `action` slot and `group/row`
- `components/tray/StickerTray.tsx` — builds `areas` once, hands each row its pencil
- `app/actions/activities.ts` — `updateActivity`; `CreateResult` became `SaveResult`, shared by both
- `learning/README.md` — Step 16 card, seven new symptom rows

**Also**

- **The compiled CSS was checked rather than assumed**, following the four false-MISSING greps of Step 14. `[@media(hover:hover)]:group-hover/row:opacity-100` compiles to `@media (hover:hover){…:is(:where(.group\/row):hover *){opacity:1}}`, and the `focus-visible` variant is there beside it. Arbitrary media variants do compose with named groups; it was worth confirming rather than believing.
- **No test file.** Nothing new is pure — `updateActivity` is a database call and the rest is JSX. `validateDraft`, which is the part with rules in it, is already covered from Step 10 and is called unchanged by both actions.
- **Before this step there was no way to rename a sticker at all**, so "Drawing" became "Painting" by hand in SQL earlier today. That's the last time that should be necessary.
- **`Bars` stopped cropping its area names**, which was a Step 12 bug that only showed once the real names were on screen. Each row was its own grid, and six independent grids can't agree where a column starts, so the name column was a guessed `minmax(0, 8.5rem)` — and "Friends & Family" is a hair wider than the guess. The fix is `grid-cols-subgrid`: the `<ul>` owns one set of columns, each `<li>` opts into them, and the first column is `max-content` — measured from the longest name that's actually there instead of predicted. `display: contents` on the rows would have worked too and would have thrown away the list semantics; subgrid keeps the `<li>` a real element.

**What to look for.** Hover any sticker in the tray and a pencil fades in at the right edge, lined up with the `+` in the header above. Tab through the rail and it appears on focus. Open it on Painting: area `Creativity & Play`, mark `✎` in a circle already the right green, name `Painting`. Change the area to Work and the circle turns blue *and* the line about past marks moving appears under the dropdown. Rename it to `Piano` while it's still under Creativity & Play and it should refuse with "You already have a sticker called “Piano” in that area."

**Open**

- **Not yet seen in a browser.** The hover reveal, where the pencil sits against a long truncated name, and whether it crowds the rail at 18rem are all things only rendering answers.
- **The tray is now two tab stops per sticker, fifteen stickers deep.** That's correct and it is also a longer rail to tab through than it was. Worth feeling before deciding it's fine.
- **`scripts/seed.sql` still says `('creativity', 'Drawing', '✎')`.** Re-running `npm run seed` would add Drawing back alongside Painting. Left alone deliberately — it's committed scaffolding — but it's now a trap with a name.
- **Step 14 and 15 have still never been looked at in a browser**, dark mode included.

---

## 2026-08-31 · Step 15 · The readout panel

**Decisions**

- **The right column is not a card, and that's the visual argument of the step.** A card is a frame, and a frame says "this is a picture, take it as a unit" — true of the chart, false of a sentence followed by a table followed by a strip. Two cards side by side would also give the page two panels and no hierarchy, when the real relationship is that one side is the picture and the other is what the picture says. So the readout sits on the page ground and behaves like the rest of the app's text.
- **The takeaway sentence is a pure function in `lib/analytics.ts`, not JSX.** All the interesting behaviour is branching — one leader, two tied, four tied, a flat range, nothing at all — and that is tedious to check by rendering and trivial to check with `assert`. `Readout.tsx` composes and computes nothing; every number, including the sentence, arrives as a prop.
- **`leaders()` returns a list, because ties are the normal result of small counts.** Sorting and taking `[0]` is how you name Exercise, quietly don't name Friends & Family, and ship a sentence that's wrong invisibly — both are on 11 this month. Same lesson as Step 12's percentage column, which tried to break a tie and produced 18% and 17% for equal counts. A function that resolves a tie before the caller sees it takes away the caller's ability to be honest about it.
- **The sentence's four shapes are four different claims, not one template with different nouns.** One name; two or three names plus "tied"; a *count* above three, because a sentence listing five life areas is a list wearing a sentence's clothes; and "spread evenly across every area" when every area is level, because a fully flat range is not a tie for the lead and calling it one is technically true and useless.
- **`Math.max` of an empty list is guarded explicitly.** It returns `-Infinity`, which matches no area and yields `[]` by luck rather than by logic — and with areas present at zero it would match all of them, which is a lie. There's a test for each.
- **`rangePhrase` exists rather than reusing `RANGE_LABEL`.** "All time" is a fine label for a dropdown and a bad thing to paste mid-clause — "…your attention All time." Same four ranges, written as adverbials, computed once in `TrendsBoard` so the sentence and the mood heading can't drift into describing the same fortnight two ways. A custom range says "in this range" rather than printing dates that are already on screen twice.
- **`moodTally` is a second pass over the same map, deliberately not folded into `tally`.** They count different units: `tally` counts *placements*, of which a day holds many, and this counts *days*, of which each holds at most one mood. Merging them would give one function returning two unrelated shapes and every caller taking half. The cost is one more walk over a map already in memory.
- **The mood strip shows all five, always, in the scale's order — never ranked, never filtered.** Stronger version of the rule the Life Star follows. These are an ordered scale running great → rough, so the sequence *is* data: 4, 9, 2, 1, 0 says the month leaned good at a glance, and the same five numbers ranked say nothing. And a zero is one of the better things the strip can report — "no rough days" is a measurement.
- **The strip's "dot" is the mood's face, which is a stated deviation from the plan's wording.** The plan asked for "a dot + name + count". A coloured dot is the one thing this app has refused to give a mood in three separate files — `MoodMark` ("no colour at all… never compete with the six area hues"), `wash()` in `palette.ts`, and `highlight.ts`. Six hues mean six life areas everywhere, and Trends is the one page where moods and areas appear together, so this is exactly where that rule would break. `MoodMark` is wrapped in `aria-hidden` here and only here: it carries its own "Mood: Great" for the calendar, where the face is alone, and the strip prints the word right beside it.
- **The empty state covers the numbers, not the page.** A range can hold moods and no marks — somebody who rates a day without placing a sticker on it — so `MoodStrip` is exported and rendered next to `Empty`. An empty state that hides data the page actually has is a bug wearing a design's clothes.
- **`items-start` on the grid, and it's load-bearing.** Without it both columns stretch to the taller one, and the chart card is a fixed `aspectRatio` by design — it would get pulled out of shape by however long the table happens to be that month. `min-w-0` on the chart column for the same reason `Bars` needs it on its name cell.
- **The break is `lg`, not `md`, and it's set by content.** The right column stops being readable somewhere around 22rem — a three-column table plus a wrapping mood strip — and at `md` each half is narrower than that. Below the break they stack chart-first, which is the order the page already reads in on a phone.

**Changed**

- `lib/analytics.ts` — `moodTally`, `MoodTally`, `MoodCount`, `leaders`, `takeaway`, `Takeaway`, `rangePhrase`, `listNames`; first value import (`./moods.ts`), header comment updated
- `lib/analytics.test.ts` — 21 new cases and a `moodDays` fixture; 183 total across the suite
- `components/trends/Readout.tsx` — new; `Readout`, `Sentence`, `MoodStrip`
- `components/trends/TrendsBoard.tsx` — two-column grid, memoized `moods` and `summary`, `phrase` computed once
- `learning/README.md` — Step 15 card, seven new symptom rows

**Also**

- **`./moods.ts` is the first value import `lib/analytics.ts` has taken, and the header comment that said "there are none" was updated rather than left to rot.** It's safe because `moods.ts` imports nothing itself — the rule that bites under `node --test` is depth, not count. The type imports stay on the `@/` alias, because those are erased.
- **A separate `moodDays` fixture rather than a parameter on `days`.** The existing helper hard-codes `mood: null` so every `tally` assertion is about activities alone; the new one carries no activities so every `moodTally` assertion is about moods alone. One helper doing both would let a bug in either count hide inside the other's numbers.

**What to look for.** This month is 63 marks with Romance & Adventure on 14, so the sentence should read "Romance & Adventure held the greatest share of your attention this month." over "63 marks in all, across every area." Exercise and Friends & Family are both on 11 — if a range ever puts *them* on top, the sentence must name both and say "tied". The chart card and the readout should sit side by side above 1024px with their tops aligned, and the card must stay square-ish regardless of how many rows the table has.

**Open**

- **Not yet seen in a browser**, and this step is more layout than the last one was. The two-column balance, where the sentence's line length lands next to the chart, and whether the mood strip wraps to two rows at a real column width are all things only rendering will answer.
- **Step 14's browser check is still outstanding too** — the deepened ramp across a full calendar month, and dark mode, which remains derived by calculation and unlooked-at.

---

## 2026-08-30 · Step 14 · Pie and Bars

> Superseded by *Trends, re-cut* (2026-09-11). The donut and the switcher are deleted; the bar chart survives, pointed at habits rather than life areas. Kept for the reasoning, not as a description of the page.

**Decisions**

- **Generic chart geometry moved to `lib/charts.ts`; `lib/lifestar.ts` kept only what a radar chart can use.** The project's own "it moves when the second caller arrives" rule, same as `firstGrapheme` in Step 10. The alternative was `Donut.tsx` importing from a module named after a different chart. `charts.ts` holds `VIEW`, `LABEL_GAP`, `LINE`, `TOP`, `round2`, `polar`, `normalize`, `labelAnchor`, `labelBaseline`, `stackOffset`, `circumference`, `donutArcs`, `sliceMidAngles`; `lifestar.ts` keeps `RINGS`, `spokeAngle`, `ringPoints`, `starPoints`, `toPoints`. Still no imports in either beyond the relative-with-extension one, for the `node --test` reason.
- **The donut is six stroked circles, not six wedge paths.** The `A` (elliptical arc) path is the obvious way and costs seven numbers per slice, two of which — `large-arc-flag` and `sweep-flag` — are single digits that silently invert the drawing when wrong, so a slice over 180° renders as its own complement. It's also the wrong primitive for a *donut*, which then needs an inner arc back the other way and a hole punched by winding direction. A stroke needs none of it: the ring already exists as a circle's outline, `stroke-dasharray` chooses which part to paint, `stroke-dashoffset` slides it round, thickness is one property, and the hole comes free.
- **The donut uses `AreaTally.share` — share of the *total* — and must never use `normalize`.** A ring is a part-to-whole claim, so its segments have to be shares of the total or the picture lies about what it shows. The star and the bars both use share of the maximum because they're about balance. Same tally, three lenses, and the divisor is the difference between them. Written into `normalize`'s own doc comment so the next caller meets the rule before making the mistake.
- **Offsets are negative, and there's a test for the sign.** A positive `stroke-dashoffset` shifts the pattern *backwards* along the path. Getting it wrong draws every segment at the right size in the wrong place, which looks like scrambled data rather than one wrong number.
- **The ring is rotated by one transform on the `<g>`, and the labels are deliberately outside it.** A stroke starts at three o'clock and everything else on this page starts at twelve, so `rotate(-90 cx cy)` on the group is one line instead of a quarter turn baked into every offset. Labels can't ride along: `rotate` on a `<g>` turns the glyphs too, so six area names would come out lying on their sides around the rim. They're placed from `sliceMidAngles`, which already includes the quarter turn.
- **`VIEW` was re-budgeted, and this is the substantive change of the step.** A box that fits the star does not fit the donut. Six spokes starting at the top put the star's side labels at 30° off horizontal, pulled in by `cos(30°)`; six *slices* starting at the top put the donut's labels at slice middles, two of which land at exactly three and nine o'clock — 17 units further out, with a longer string attached. The `cos` came out of the budget line, and the shared frame now satisfies the worse of its two tenants rather than the one it was designed for. Height went 300 → 320 because the donut's labels are two lines.
- **The donut stacks its percentage under the name rather than running it on after a `·`.** Partly measurement — at full horizontal reach the extra `" · 17.5%"` is the difference between fitting and clipping, and stacking is cheaper than the ~90 more units of width the circle would then sit in the middle of. Partly that a two-line label is the more readable object anyway.
- **`stackOffset`, because `dominant-baseline` positions a line and not a block.** A right-hand label asked for `middle` centres its *first* line on the slice, so the pair hangs half a line low and every label on that side drifts down together — it reads as sloppy alignment rather than as a bug, which is the kind that survives a review. `LINE = 14` is a named constant because two things have to agree on it and neither can ask the browser: SVG has no line box, so leading is a number somebody picks.
- **Both radial charts share one `viewBox` on purpose.** You flip between them while looking at the same numbers; a second box would resize the card and jump everything under it. The donut's ring is drawn at `radius - THICKNESS/2` so its *outer edge* lands exactly on the star's outer ring — a stroke straddles its path, so a ring drawn at 110 would reach 123 and collide with labels at 126.
- **…and the bars join them, which took a `ChartCard`.** The shared `viewBox` gave the star and the donut equal height for free, so the rule looked done — but the bars are HTML and six rows are as tall as six rows are, so switching to them still resized the card. A fix that covers two of three lenses isn't the fix. `ChartCard` states the ratio once, derived from `VIEW` so it can't drift from the box it's matching, and holds the `aria-hidden` all three were carrying separately — that flag is true because `AreaTable` is on the same page, which is a fact about the page and not about any one drawing. The bars then use `h-full` + `justify-between` to spread six rows into a box sized for a circle. `min-h-fit` is the stated escape hatch: on a phone the ratio is shorter than six rows of text, and a taller card beats a clipped one.
- **The donut's stroke does *not* get `vector-effect="non-scaling-stroke"`, and that's the opposite of every other stroke here.** A hairline wants to be one device pixel at any size; this stroke *is* the drawing, and pinning it would render a 26-pixel band regardless of the card's width. The question is whether the thickness is part of the picture or part of the furniture.
- **The bars are HTML, not SVG.** A bar is a rectangle of a given width. Going to SVG would mean giving up text that wraps, a font that inherits, and a layout that reflows at any card width, all to draw six boxes. SVG earns its keep on the star and the donut because those have angles in them.
- **The bars sort descending; the star and the donut never sort.** The one place the three genuinely disagree, and the seam Step 12 built. A bar chart has no shape to spoil, and unsorted bars are a table with worse numbers. The sort is a copy, because `tally.areas` is memoized upstream and shared with everything else on the page.
- **Zero gets an empty track and a dash, not a missing row.** Consistent with `AreaTable`: zero is a measurement, a dash is "nothing here", and "this area exists and you did none of it" is a different statement from "this area isn't here". A *nonzero* bar gets `min-w-2.5` so it never renders narrower than it is tall — `rounded-full` on a 6×10 fill is a lopsided blob rather than the pill every other row wears.
- **The switcher is built on the Radix primitives directly, not on `components/ui/radio-group`.** That preset's item is a hard-styled `size-4` circle with an indicator dot inside — right for the day modal's mood picker, which still uses it, and wrong here: a pill would override every one of those classes and still carry the dot. Same library, same keyboard behaviour, none of the fight. A preset is a starting point for the shape it was drawn for.
- **A radio group rather than three buttons.** Few, short, mutually exclusive options you flip between repeatedly — the case a segmented control exists for, where a dropdown hides two of three answers behind a click each. Being a radio group is what makes arrows move between segments, Tab leave the control, and a reader announce "Pie, 2 of 3". `orientation="horizontal"` is load-bearing: Radix defaults to vertical, which decides *which* arrow keys work.
- **The nav and the switcher share a class string, not a component.** They can't share a component — nav segments are `<a href>`s so a tab is a link you can middle-click, switcher segments are radios because picking a lens isn't navigation. Different elements, different semantics, one appearance, so `segment(active)` in `lib/layout.ts` is written as a function rather than three strings: the on/off pair is the actual unit, and an active segment that forgot to stop being muted is the bug that prevents.
- **One chart is mounted at a time rather than three with two hidden.** Hidden charts stay in the DOM and in the accessibility tree, and Step 16 animates this — a thing that enters is far easier to animate than a thing that was always there wearing `display: none`.
- **All three charts are `aria-hidden`, under the same stated condition.** `AreaTable` renders the same names and numbers as a real table on the same page. Worth saying out loud for the bars in particular, because they *are* text and a reader would happily announce all of it — which is precisely the duplicate to avoid.
- **`RAMP` gained an SVG `stroke` per hue.** A donut segment is a stroked circle with no fill at all, so neither `bg-` nor `fill-` reaches it. Same six colours, another property, written out literally for the Step 1 reason.
- **Then every chart went pastel, and the saturated SVG paints were deleted.** Trends had been painting full-strength while the calendar painted tints, so one area was two different reds depending on the tab. Stephanie's call, and the direction was hers too: the tints win.
- **The tints were then deepened from 28% to 48%, which is the change that actually made it work.** The first pass kept the ramp where it was and papered over the consequence — a 10px tint on cream measures 1.19:1 at its worst, so the table swatch, the star's vertex dots and the sticker picker's dot each got a hairline ring to give them an edge. Three rings is three symptoms. The cause was that a ramp tuned for a 26px sticker was being asked to carry a 10px dot, and Stephanie named the fix by naming a colour: `#e2a79c` for red-soft. That turned out to be *the same recipe at a different number* — these tokens are `mix(hue, surface, 28%)`, and her value is that mix at 48% (it lands on `#e2a69e`, one step off). So one number moved, all six hues followed, and all three rings came off. **A palette written as a recipe can be re-tuned; a palette written as six hex values can only be re-picked.**
- **The two themes had to part company on that number: 48% light, 42% dark.** Mixing further from the surface means *toward the full hue* — brighter in the dark theme, darker in the light one. So the same step that adds contrast under `--ink` on one side takes it away on the other. `--ramp-yellow` binds: at 48% the mark on a Creativity & Play sticker falls to 4.03:1, under the 4.5 this file has always held. 42% is the furthest the dark side travels and still clears it. Light-theme ink now sits at 7.19–10.70:1 across all six.
- **The star's vertex dots ended up with no ring at all.** They wore one through three versions — cream, then hairline, then cream — and every version was answering a question the ramp has since answered. The ring's *stated* job was separating two dots on a pinched (near-zero) polygon; its actual job had become giving a 28% tint an edge. At 48% the fill is its own edge, and on an 8px dot any ring reads as an outline drawn round it rather than as the gap it was meant to be. The separation case now rests on hue, which is fine because adjacent areas are different colours — worth a look if a range ever puts two near-empty areas side by side.
- **Every button got its hand cursor back, from one base rule.** Tailwind v3's Preflight set `cursor: pointer` on `button`; v4 dropped it to match the browser default, which is an arrow. Defensible as a default and wrong for this page. The fix is one rule in `@layer base`, and the selector list is what Radix actually renders rather than a guess: radio items and dropdown triggers are real `<button>`s, a Select option is `<div role="option">` and a menu item is `<div role="menuitem">`, so those are named. `label[for]` is in because a bound label is a click target — the mood picker's rows are the case. Disabled is excluded three ways, because native `disabled`, Radix `data-disabled` and `aria-disabled` are three spellings of the same thing.
- **Twelve `cursor-pointer` classes came out as the rule went in.** They had accumulated one at a time across nine components, which is what a missing base rule looks like from the inside: each local fix works, so the cause is never found, and the next control starts the count at thirteen. Removing them is the point rather than tidiness — leaving them would teach the next component to add a fourteenth.
- **Adjacent wedges were measured, not eyeballed, both times.** At 28% the worst adjacent pair in the ring (orange-soft against yellow-soft) was ΔE 10.5 and the palest bar against its track ΔE 11.2 — readable, because **area** is what carries a tint and a 26-unit band and a full-width pill have area. At 48% those go to 17.1 and comfortably clear. The dots were always the problem, never the big shapes.
- **`fill` and `stroke` were removed from `RAMP` rather than left unused.** They went dead the moment the charts switched, and a rule you keep by remembering it isn't a rule. With the classes gone there is no way to paint an SVG in a saturated hue without adding one back, which is a diff big enough to catch in review. (`text` and `border` were already unused before this step and were left alone — not this step's business.)

**Changed**

- `lib/charts.ts` — new; the shared geometry, `ChartKind`/`CHART_KINDS`/`CHART_LABEL`, and the donut math
- `lib/charts.test.ts` — new; 46 cases
- `lib/lifestar.ts` — trimmed to radar-only; `spokeAngle` now reads `TOP`
- `lib/lifestar.test.ts` — trimmed to 15 cases, the rest moved
- `components/trends/Donut.tsx` — new; pastel segments
- `components/trends/Bars.tsx` — new; pastel fills
- `components/trends/ChartSwitcher.tsx` — new
- `components/trends/ChartCard.tsx` — new; the one panel all three charts draw into
- `components/trends/TrendsBoard.tsx` — `chart` state, the switcher, one chart mounted at a time
- `components/trends/LifeStar.tsx` — imports follow the split; pastel dots with a hairline ring
- `components/trends/AreaTable.tsx` — swatch went pastel, gained a ring
- `components/tray/NewStickerForm.tsx` — picker dot matches the other two
- `lib/palette.ts` — `softFill`/`softStroke` on every ramp; saturated `fill`/`stroke` deleted
- `app/globals.css` — the soft ramp re-mixed at 48% (light) and 42% (dark); a base `cursor: pointer` rule
- `components/{ThemeToggle,UserMenu,ui/button}.tsx`, `components/calendar/{DayCell,DayModal,MonthHeader}.tsx`, `components/tray/{StickerTray,TrayGroup,NewStickerForm}.tsx` — twelve redundant `cursor-pointer` classes removed
- `lib/layout.ts` — `segment(active)`
- `components/TopNav.tsx` — uses it
- `learning/README.md` — Step 14 card, nineteen new symptom rows

**Also**

- **The `-0` trap appeared twice in one file.** `donutArcs` hit it first (the first segment's offset), and `stackOffset` hit it again — `-(0)` is `-0`, and `Object.is(-0, 0)` is false, which is what `assert.strictEqual` compares with. Caught by a test both times. Fixed by early-returning rather than negating, which reads better anyway: a one-line label doesn't move.
- **Mutation-tested, fourth suite to get it.** Flipping the dash offset's sign failed 4 cases, labelling slice starts instead of middles failed 2, `circumference` treating the radius as a diameter failed 1, and `normalize` dividing by the total instead of the max failed 3. Every one of those still draws a plausible-looking chart.
- **The viewBox problem was found by computing again, not by looking.** Same method as Step 13: took the six real area names and counts, ran the label extents through the actual geometry, and compared against the box. It reported the donut's labels reaching past the edge before anything rendered. After the resize the six labels span x 49–429 and y 27–281 in a 520×320 box — 49 units of slack at the tightest side. That check is in `/tmp` and not committed; the durable version is the `VIEW` test, which asserts the budget rather than the six particular names.

**What the three charts should show, from the same ground truth.** This month is 63 marks: Romance & Adventure 14 (22.2%), Exercise 11 (17.5%), Friends & Family 11 (17.5%), Work 10 (15.9%), Spirituality 9 (14.3%), Creativity & Play 8 (12.7%).

- **Pie** — the hub reads **63**, and the segments run clockwise from twelve in *library* order: Spirituality, Exercise, Work, Creativity & Play, Romance & Adventure, Friends & Family. Romance is the widest wedge at 80° of the circle, spanning roughly the lower-left, and the ring should close with no visible seam. If the wedges come out ordered biggest-first, the library-order rule has been undone; if the ring starts at three o'clock, the group transform is missing.
- **Bars** — six rows biggest-first: Romance full width, then Exercise and Friends & Family at exactly the same length (both 11, and `sort` being stable puts Exercise first because it's earlier in the library), Work at 71%, Spirituality at 64%, Creativity & Play shortest at 57%. Two identical bars adjacent is the check worth making — it's the same equal-counts case that killed apportionment in Step 12.
- **Switching** — the card must not change size between *any* two lenses now, bars included. If only the bars jump, `ChartCard`'s `aspectRatio` isn't reaching them; if the bars clip instead, `min-h-fit` isn't.
- **Colour** — a given area is the same tint on both tabs. Romance & Adventure is `#a8c6a4` on its calendar stickers, in its donut wedge, in its bar, and in its table swatch. Any saturated hue left anywhere on Trends is a miss, and so is any ring around a dot — the star's vertex dots are bare fills now.

**Open**

- **Not yet seen in a browser.** Everything above is computed, and text metrics are the half that can't be. The donut's labels have generous slack at these six names, but that's a measurement of this library and not a guarantee.
- **The deepened ramp changes every sticker on the calendar, not just Trends.** That's the intent — one ramp, both pages — but the calendar is where a month of stickers sits side by side, and "quiet enough not to shout over the dates" was the original 28% brief. 48% is still a tint and ink still clears 7:1 on it, but whether a full month still reads as calm is the thing to actually look at.
- **Dark mode is derived, not inspected.** The 42% figure clears the ink threshold by calculation. Nobody has looked at it.
- **A donut with a very small share draws a segment thinner than its own label.** Nothing in the data does this today (the smallest is 12.7%); an area with one mark out of 300 would get a hairline wedge and a full-width label pointing at it. Left alone — the fix is either a leader line or a legend, and Step 15's readout may make the question moot.
- **The chart choice dies on refresh, deliberately**, same as `range` and Step 11's highlight. Worth revisiting only if it turns out people have a preferred lens rather than a per-visit one.
- **Everything Steps 12 and 13 left open is still open** — the unlabelled rings, the long-name clipping risk, the Step 8 duplicate-drop no-op, `scripts/seed.sql`, nothing removing a sticker from the library, `CalendarBoard`'s inline `initialMonth`, moods not counted anywhere, and `react-day-picker`'s bundle cost.

**State:** `npm test` 165/165 (up from 139), `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `{fill,stroke,bg}-ramp-{red,blue,orange,yellow,green,purple}-soft`, `ring-hairline`, `min-h-fit`, `h-full`, `justify-between`, `stroke-hairline`, `fill-ink-muted`, `min-w-2.5`, `bg-secondary`, `tracking-[0.18em]`, `h-2.5`, `grid-cols-[minmax(0,8.5rem)_1fr_2.5rem]`, `text-[30px]`, `text-[10px]`, `focus-visible:ring-2` and `focus-visible:ring-ring/50` reached the compiled CSS with real values — tenth time. Also checked the *absence* of the deleted `fill-ramp-*`/`stroke-ramp-*`, which is the half of that check this step needed: Tailwind ships what it finds in source, so a class disappearing from the CSS is the proof the last caller is gone. And confirmed all twelve re-mixed `--ramp-*-soft` values landed in the compiled sheet in both themes — the first attempt reported all six MISSING because the matcher expected `--x: #hex` and the output has no space after the colon. Third false MISSING in this file's history from a grep written against the source spelling rather than the compiled one, and then a fourth in the same session — the cursor rule ships as `[role=option]` because the minifier drops the quotes the source has. The lesson has stopped being about escaping and started being about *reading the artefact before writing the matcher*.

One curiosity from that pass: `.cursor-pointer` is still in the compiled sheet even though no component asks for it any more. The only remaining occurrence of the string is inside the CSS comment explaining the base rule — and Tailwind scans `app/globals.css` as source text like everything else, so a class named in a comment gets generated. Harmless at ~25 bytes, and a neat footnote on the scanner rule this project has now hit three ways: it can't see a name you assemble, and it *can* see one you only mention. Two notes from that check: the selectors are CSS-escaped (`.h-2\.5`, `.focus-visible\:ring-2:focus-visible`), so a grep written against the class name as typed reports a false MISSING for every one that contains a dot, bracket or colon; and `ring-ring/50` shows the same two-rule opaque-fallback-plus-`color-mix` pattern Steps 11 and 13 recorded. Uncommitted.

---

## 2026-08-30 · Step 13 · The Life Star

**Decisions**

- **The geometry is a pure module with no imports, and the component does no arithmetic.** `lib/lifestar.ts` holds `spokeAngle`, `polar`, `normalize`, `ringPoints`, `starPoints`, `toPoints`, `labelAnchor`, `labelBaseline`; `LifeStar.tsx` decides only what order things are drawn in. The split is about what can be checked: a number can be asserted and a drawing can only be looked at, and every one of those functions has a wrong answer that still renders a plausible chart. Same `node --test` constraints as `lib/analytics.ts`, hence no imports at all.
- **Radius is a share of the maximum, not of the total, and the cost is stated.** Against the total, six areas at 20 marks each draw a small hexagon at 16.7% and the shape says nothing the number 20 didn't. Against the maximum, the busiest area pins to the outer ring and the shape becomes about balance — a spike or a regular hexagon — independent of whether the month held 60 marks or 600. What that gives up is magnitude: identical proportions at any size draw the same polygon. That's what the counts in the spoke labels are for. The shape carries the balance, the labels carry the number, and neither is asked to do the other's job.
- **`normalize` returns zeros rather than `NaN` for an all-zero range.** `0/0` would poison every coordinate, and SVG's response to `NaN` inside a `points` attribute is to drop the shape without a word — so an empty range would render as a *missing* polygon rather than a collapsed one. `Math.max(0, ...counts)` also survives an empty array, where bare `Math.max()` is `-Infinity`.
- **`spokeAngle` is `-π/2 + (2π / n)·i` and nothing writes 60.** The `-π/2` is the load-bearing half: angle 0 points east, and SVG's y axis grows *downward*, so positive angles sweep clockwise — the opposite of the maths convention and the reason most hand-rolled radar charts come out rotated or mirrored. Subtracting a quarter turn puts spoke 0 at twelve o'clock and sends the rest round in reading order.
- **The rings are polygons, not circles.** At 25% the two are nearly the same shape, but a polygon's corners land exactly on the spokes, so a vertex sitting on a ring visibly sits on it. With circles the star's corners cut between their own gridlines and reading a value off the chart stops being possible.
- **`EPSILON`, because `Math.cos(-Math.PI / 2)` is `6.123e-17` rather than 0.** π/2 isn't exactly representable in binary, so the top spoke — pointing straight up — has a positive cosine, and a bare `cos > 0` in `labelAnchor` anchors its label as if it were on the right-hand side, hanging a full name's width off a spoke that points at neither side. It reads as a layout bug and it's an arithmetic one. The tests can't use `assert.equal` on any coordinate for the same reason, and the tolerance lives in the test file rather than being rounded away inside the functions — rounding to make an assertion pass is the test dictating the implementation.
- **`labelAnchor` and `labelBaseline` read the same cosine and ask different questions.** One asks "which side of the chart is this on" (sign of cos → `start`/`end`), the other asks "is this on the vertical axis at all" (`|cos|` → only then push clear, up or down by the sign of sin). So a four-spoke star's horizontal labels are `middle` vertically and `start`/`end` horizontally. Writing anchors out per area is a table that is correct at six and silently wrong at seven.
- **`VIEW.width` is a calculation, not a nice round number.** The labels sit outside the outer ring, the four side ones come off at 30° from horizontal, and the root `<svg>` clips at the viewBox edge — so a name that doesn't fit is a name with its last letters sliced off, and SVG can neither measure text nor reflow it. Budgeted as `2·(radius + gap)·cos(30°) + 2·textWidth` ≈ 478 for the longest label the real data produces, rounded up to 520. The per-character figure is an estimate (there is no way to measure a font from Node), which is why the slack is the point.
- **`vector-effect="non-scaling-stroke"` on every stroke.** The viewBox is 520 units shown across roughly 600px, so a 1-unit hairline renders at ~1.15px, lands on a half-pixel boundary and looks furred. This pins it to one device pixel at any size, which is what "hairline" is supposed to mean everywhere else in this app.
- **The polygon is filled neutral (`fill-ink/10`) with per-area coloured vertex dots** — the prototype's choice, kept. Six hues meeting inside one polygon makes a muddy shape belonging to no area; the dots carry the colour instead. Each dot gets a `--surface`-coloured ring so that two vertices pinched near the centre don't read as one blob.
- **`aria-hidden` on the SVG, with the condition written into the comment.** A radar chart is shape, and shape doesn't survive being read aloud; the honest text version is a table of counts, which `AreaTable` already renders from the same tally on the same page. Two announcements of one dataset is worse than one good one. The comment states what makes that correct — *while the table is on screen beside it* — so that a step which ever renders the star alone finds the dependency instead of inheriting a silently inaccessible chart.
- **The star draws `tally.areas` in library order and never sorts.** This is the seam Step 12 built and the step that collects on it. A polygon whose vertices reorder by count changes shape because the *ranking* moved rather than the counts, and two ranges stop being comparable — which is the one thing this chart is good at.
- **Stacked above the table, not beside it.** Step 15 builds the two-column layout (chart card left, readout on the page ground right); guessing at it here would mean building it twice.
- **`RAMP` gained a `fill` per hue.** SVG paints with `fill`; `background-color` does nothing to a `<circle>`, so `bg-ramp-red` is not reusable here. Written out literally like the rest of the map, for the Step 1 reason — Tailwind scans source text and never runs the code.

**Changed**

- `lib/lifestar.ts` — new; `VIEW`, `RINGS`, `LABEL_GAP`, `spokeAngle`, `polar`, `normalize`, `ringPoints`, `starPoints`, `toPoints`, `labelAnchor`, `labelBaseline`
- `lib/lifestar.test.ts` — new; 34 cases
- `components/trends/LifeStar.tsx` — new; the chart and its card
- `lib/palette.ts` — `fill` on every ramp
- `components/trends/TrendsBoard.tsx` — renders the star above the table
- `learning/README.md` — Step 13 card, eleven new symptom rows

**Also**

- **A test asserted the wrong thing again, and again the code was right.** I claimed `toPoints` should round `1.005` to `1.01`. It rounds to `1` — `1.005 * 100` is `100.49999999999999` in binary, so `Math.round` takes it down, because the literal written as `1.005` isn't quite 1.005 to begin with. Every accurate-rounding fix costs real complexity, and the quantity is a hundredth of one viewBox unit out of 520 — far below a pixel. Pinned the real behaviour with the reasoning, same call as Step 12's `percents([999, 1], 1000)` case.
- **The viewBox was too narrow on the first pass and the tests couldn't have caught it.** 460 wide put "Romance & Adventure · 42" at x 323 with ~140 units of text after it, which clips. Found by computing the label extents against the real ground-truth counts rather than by looking, since the numbers are available and the browser wasn't. Widened to 520 and re-checked: the longest label lands at x 21–151, about 21 units of slack. **Text metrics are the one part of an SVG chart that unit tests genuinely cannot reach** — worth knowing which half of the work still needs eyes.
- **Mutation-tested, third suite to get it.** Dropping the `-π/2` from `spokeAngle` failed 9 cases, removing the `EPSILON` guard failed 3, and normalizing against the total instead of the max failed 3. All three are changes that still produce a chart.

**State:** `npm test` 139/139 (up from 105), `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `fill-ramp-{red,blue,orange,yellow,green,purple}`, `fill-none`, `stroke-hairline`, `stroke-ink`, `fill-ink`, `fill-ink-muted`, and `rounded-2xl` reached the compiled CSS with real values — ninth time. `fill-ink/10` shows the same two-rule pattern Step 11 recorded for `bg-ink/10`: an opaque `fill:var(--ink)` followed by `color-mix(in oklab, var(--ink) 10%, transparent)` inside an `@supports` guard, so reading only the first hit would say the polygon is solid. Committed as `d69bef4`.

**What the chart should look like, from the same ground truth.** Library order is Spirituality, Exercise, Work, Creativity & Play, Romance & Adventure, Friends & Family — so clockwise from the top those are the six spokes, and they stay in those positions in every range. This month (max is Romance at 14): Romance & Adventure alone touches the outer ring, Exercise and Friends & Family sit at 0.79, Work at 0.71, Spirituality at 0.64, Creativity & Play lowest at 0.57. So the outline should lean noticeably toward the lower-left (Romance's spoke) and be fairly even elsewhere — no spikes, since the spread is 8 to 14. Switching to All time (max is Romance at 42) should keep the same lean and pull Creativity, Work and Spirituality in slightly. If the polygon's longest arm points anywhere but at Romance & Adventure, the library-order-not-ranked decision has been undone somewhere.

**Confirmed in the browser on 2026-08-30.** The star leans the way the counts say it should, so the whole chain holds: library order survives into the drawing, the spokes are where `spokeAngle` puts them, and normalizing against the max does pin the busiest area to the outer ring.

**The label-width estimate survived contact with the real names, which is the half tests couldn't reach.** Nothing clipped at these six areas — but that's a measurement of *this* library, not a guarantee: the budget in `VIEW` is still an estimate of per-character width, and the check has to be repeated for a longer area name or a seventh spoke. The failure mode is silent and cosmetic (a name loses its last letters at the viewBox edge), which is exactly the kind that survives a long time unnoticed.

**Open**

- **Everything Step 12 left open is still open** — the Step 8 duplicate-drop no-op and failure line, `scripts/seed.sql`, nothing removing a sticker from the library, no sign of *which* sticker matched on an area highlight, `CalendarBoard`'s inline `initialMonth`, moods not counted anywhere, and `react-day-picker`'s bundle cost.
- **The rings have no labels.** They're 25/50/75/100% *of the busiest area*, which is not self-evident from looking, and nothing on the chart says it. Left alone deliberately: Step 15's readout is where words about the chart are supposed to go, and a legend competing with six spoke labels would be the noisier fix.
- **A long life-area name can still clip**, because the width budget is an estimate of text metrics rather than a measurement. Twenty units of slack at six areas; an area named much longer than "Romance & Adventure", or a seventh area changing the angles, would need re-checking. There's no way to measure it from Node, so this one is genuinely a look-at-it check.
- **`LifeStar` is not a Client Component and doesn't need to be**, but it renders inside one (`TrendsBoard`), so it's in the client bundle regardless. Worth remembering at Step 17 that the whole Trends tree ships.

**Next:** Step 14 — Pie and Bars.

---

## 2026-08-22 · Step 12 · Aggregation and the range picker

**Decisions**

- **Aggregate in the browser, and say when that stops being right.** `getStickersByDay` already sends every placement to the client so the calendar can draw any month without a request. Given that, counting them here is one pass over an array that's already in memory, and switching range costs nothing. A `group by` in Postgres would be a round trip per dropdown change to re-derive numbers from rows we're already holding. The condition is written into `tally`'s doc comment: this is right *because* the calendar fetches everything, so the day that changes — a few thousand rows, per the existing note — both move together.
- **A range is a rule, not a pair of dates.** `{kind: "month"}` carries no dates at all; `resolveBounds(range, today)` produces them on each render. Storing `{from, to}` at pick time is a tab left open overnight still reporting on yesterday's month, and it's the same class of bug as caching a derived value that Step 11 avoided with `useMemo` over `buildHighlight`.
- **No `Date` object anywhere in `lib/analytics.ts` — the file imports nothing at runtime.** "This month" is `` `${today.slice(0, 7)}-01` ``; "this year" is `` `${today.slice(0, 4)}-01-01` ``. This is the payoff for Step 5 storing days as `"2026-08-12"`: the format is zero-padded and big-endian, so it sorts lexicographically exactly as it sorts chronologically, and `inBounds` is two string comparisons. Nothing in the file can be off by a day in a timezone because nothing in it knows what a timezone is.
- **"This year" is the calendar year to date**, 1 January through today — not a trailing twelve months. It matches what the words say and matches how "this month" already behaves; both are the period you're currently inside. The cost, accepted: in January the year range is nearly empty, which is honest but can read as missing data.
- **A dropdown for the range, not a segmented pill.** Step 14 puts a real segmented pill on this same page for Life Star / Pie / Bars, and two pills stacked are two controls of equal weight competing to look like the important one. They aren't equal: the chart switcher is a lens you flip while looking, the range quietly governs every number underneath including the chart's. Different jobs, different weights.
- **The area an activity belongs to comes from the library, not from the placement.** A `day_activities` row records which activity, and the activity's area is a fact about the activity *now* — so moving a sticker to another life area moves its whole history with it. That's correct for a habit tracker (you reclassified the habit, not the days), and it's a position rather than an accident: the alternative is stamping an area onto every placement and never being able to correct a mistake.
- **`unattributed` is a field on the tally, and it's always 0 today.** `getStickerLibrary` filters `archived`, so once anything archives a sticker, its past placements stop being attributable to an area. Without this they'd silently stop being counted. With it, the total still includes them and the page says so in a sentence. A number quietly going wrong is the failure mode worth a field.
- **Percentages carry one decimal and are rounded independently — apportionment was tried first and removed.** The original `percents` floored every row and handed the leftover points to the largest remainders (largest-remainder, the seats-to-votes method), so the column summed to exactly 100 by construction. Real data killed it: Exercise and Friends & Family are both 11/63, there was one leftover point and two equal claims on it, and the tie-break gave one of them 18% and the other 17% — on adjacent rows, because the table sorts by count. Correct arithmetic, reads as a bug, and the worse failure of the two: a column summing to 99 makes you doubt the last digit, two equal counts with unequal shares makes you doubt the whole table. `percent(count, total)` is now a pure function of its own two numbers, so equal in guarantees equal out. The decimal place is what makes the trade cheap — the tie lands on 17.5% twice, and the drift is a tenth rather than a whole point.
- **The total row prints the column's real sum, not a flat "100%".** Both live ranges come to 100.1%. Those are two different claims: "these are all your marks" is true regardless, "these numbers add up" has to survive being checked with a finger, and 100% over a column reading 100.1 is exactly the discrepancy you'd find. Re-rounded after summing, because adding one-decimal floats lands on 100.10000000000001. Shares render as `toFixed(1)` even when whole (`20.0%`), so every decimal point sits in one vertical line — which is the reason the column is `tabular` at all.
- **The table ranks biggest-first; `tally` does not.** The sort lives in `AreaTable`, over a copy, and that seam starts mattering in the next step. `tally.areas` stays in the library's own order because the Life Star draws one spoke per area and the spokes have to sit still — a polygon whose vertices reorder by count changes shape for a reason that has nothing to do with the data, and two ranges stop being comparable. The table wants a ranking, the chart wants a fixed frame, and both read the same tally. A copy rather than a sort in place, because `tally.areas` is memoized upstream and shared; `sort` is stable, so equal counts keep the library's order instead of swapping between renders.
- **The header is just "Trends", and the range control sits under it.** The eyebrow and "The shape of your attention" both went. Pushed to the far right the dropdown read as page furniture — the same slot the nav's controls occupy — when it's actually the first thing you set before reading anything below it. Under the heading and above the numbers, it sits in the order you use it.
- **The resolved dates sit beside the dropdown, and the table's caption is `sr-only`.** A rule and its resolution are only useful side by side — "This month" doesn't tell you it means the 1st to the 22nd — so the dates moved up next to the control that produces them, and the line above the table went away rather than saying the same thing twice. It shows for the fixed ranges only: "All time" has no edges to print and its own label is the whole answer, and a custom range already prints its dates on the popover button. The `<caption>` element stays in the markup because hidden and gone aren't the same thing — it's the table's accessible name, so a screen reader entering it hears "Marks by life area, This month: 1 Aug 2026 — 22 Aug 2026" rather than a column of numbers with no period attached. Sighted readers get that from proximity; this is the same context delivered the other way. The dates also carry `aria-live`, because the dropdown announces the rule it changed to and nothing would otherwise announce the period.
- **A real `<table>`, with `scope` on every header and a `<caption>`.** Rows of numbers are the one thing a screen reader genuinely cannot reconstruct from layout — given a table it says "Spirituality, Marks 14, Share 22%", given divs it reads eighteen unlabelled numbers. The caption is what attaches a period to them; "14" with no range named is not a fact.
- **Zero renders as an em dash, not `0`.** Zero is a measurement; a dash is "nothing here". At a glance the eye skips a dash and counts a zero.
- **`tabular` on both number columns.** The utility already existed in globals.css from Step 1 and this is its first caller. Proportional figures re-space the column when a 1 becomes a 7, which reads as the table twitching every time the range changes.
- **The board takes `initialToday` as a prop instead of computing it.** `TrendsView` reads the clock on the server and passes it down; `useSyncExternalStore` uses it for the server render *and* hydration, then swaps in the visitor's own date. Same shape as `MonthGrid`, with one difference worth keeping: `CalendarBoard` computes its equivalent (`toMonthString(new Date())`) inline in a client component, so the server's copy and the browser's are two separate calls to the clock. A value computed twice in two places is a value that can differ.
- **An empty result gets a sentence, not six zero rows.** And it says *which* kind of empty: a half-drawn custom range gets an instruction, "all time" with nothing in it points at the Calendar tab, and a fixed range with nothing in it suggests a wider one.
- **The custom range button shows its dates rather than saying "Custom".** A control that's been used should say what it was set to, or you have to open it to find out.

**Changed**

- `lib/analytics.ts` — new; `Range`, `Bounds`, `resolveBounds`, `inBounds`, `tally`, `percent`
- `lib/analytics.test.ts` — new; 36 cases
- `lib/dates.ts` — `fromDayString` exported, `formatDayShort` added, `formatDayLong` refactored onto it
- `components/trends/TrendsBoard.tsx` — new; owns the range, memoizes the tally
- `components/trends/RangePicker.tsx` — new; the dropdown and the custom popover
- `components/trends/AreaTable.tsx` — new; the table, ranked biggest-first
- `components/views/TrendsView.tsx` — the placeholder is gone; fetches and passes `initialToday`
- `components/ui/calendar.tsx` — new (shadcn, unmodified)
- `package.json` — `react-day-picker`
- `learning/README.md` — Step 12 card, nine new symptom rows

**Also**

- **`shadcn add` overwrote a local edit to `components/ui/button.tsx`, and Step 1's claim that shadcn files "stay untouched" turns out to be false.** Our copy had `cursor-pointer` added to the base variant at some point; the CLI's `--overwrite` silently removed it. Caught by diffing against a copy taken before the add, and restored. The CLI is also interactive by default — it stops on a per-file "overwrite?" prompt that can't be answered from a tool call, and it installs the npm dependency *before* it hits that prompt, so a half-finished add leaves `package.json` changed and no component file.
- **A test asserted the wrong thing and the code was right.** I wrote a case claiming `percents([999, 1], 1000)` should give the rare item 1% rather than letting it vanish. Largest-remainder correctly handed the leftover point to the row that lost most in the flooring — the 999 — so it was 100/0. Pinned the real behaviour rather than working around it. Moot now that apportionment is gone: 1 in 1000 is 0.1%, which one decimal place can actually show. The floor moved rather than disappearing — 1 in 5000 still rounds to 0.0%, with the count column beside it saying `1`.
- **Grepping the compiled CSS for a class can miss it because Tailwind groups selectors.** `text-ink-muted` looked absent until the pattern allowed for `.text-ink-muted,.text-ink-muted\/60{...}` — identical declarations get merged into one comma selector. Two others looked absent because the class name contains a literal backslash (`.py-2\.5`) that the regex was eating. Both were false alarms; all nine classes are real.

**State:** `npm test` 105/105 (up from 69), `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `tabular`, `border-collapse`, `w-44`, `max-w-2xl`, `py-2.5`, `border-hairline`, `size-2.5`, `bg-ramp-green`, and `text-ink-muted` reached the compiled CSS with real values — eighth time. Committed as `f7357db`.

**Ground truth from the hosted database, to check the table against.** 167 placements, one user, spanning 2026-07-02 to 2026-08-22 — so "this year" and "all time" are the same 167, and only August separates "this month". Per area, this month / all time: Spirituality 9/23, Exercise 11/27, Work 10/23, Creativity & Play 8/22, Romance & Adventure 14/42, Friends & Family 11/30. This month totals 63. Ranked biggest-first, the table should read Romance & Adventure 14 / 22.2%, Exercise 11 / 17.5%, Friends & Family 11 / 17.5%, Work 10 / 15.9%, Spirituality 9 / 14.3%, Creativity & Play 8 / 12.7%, total 63 / 100.1%. All time: Romance 42 / 25.1%, Friends 30 / 18.0%, Exercise 27 / 16.2%, Spirituality 23 / 13.8%, Work 23 / 13.8%, Creativity 22 / 13.2%, total 167 / 100.1%. Both ranges contain a live tie — 11/63 twice this month, 23/167 twice all time — and both now show identical shares, which is the whole point of the rounding change. If the browser shows those numbers, every part of the chain is right.

**Confirmed in the browser on 2026-08-30.** The table reads correctly against the ground truth above — including the two things the step was actually risking: Exercise and Friends & Family both showing 17.5% on adjacent rows, and the total row printing 100.1% rather than a flat 100%. So the rounding change survived contact with the tie that killed apportionment, and the total is summing the column it prints rather than asserting a constant.

**The eight days between writing the step and confirming it demonstrated `resolveBounds` for free.** The ground-truth note above was computed on 2026-08-22 and says "this month" spans 1–22 Aug; confirmation happened on the 30th, so the same `{kind: "month"}` now resolves to 1–30 Aug. The counts are unchanged because nothing has been placed since the 22nd — but the *bounds* moved on their own, with no code running and nothing invalidated. A stored `{from, to}` picked at the time of writing would still be reporting on 1–22 Aug today, which is exactly the stale-tab bug the rule-not-a-pair decision was written to avoid. Not verified deliberately; the calendar just kept turning. (Not checked on screen: whether the resolved dates beside the dropdown print the new end date. They're the same `resolveBounds` call the numbers come from, so this is an inference, not an observation.)

**Open**

- **Everything Step 11 left open is still open** — the Step 8 duplicate-drop no-op and failure line, `scripts/seed.sql`, nothing removing a sticker from the library, and no sign of *which* sticker matched on an area highlight.
- **`CalendarBoard` computes `toMonthString(new Date())` inline as `initialMonth`.** In a client component that runs once on the server and again during hydration, so across a month boundary the two can disagree — the exact mismatch `MonthGrid`'s `useSyncExternalStore` was written to avoid, reintroduced one level up. Trends does it correctly by passing the value down from a Server Component. Worth making the calendar match; not touched here because it isn't this step's file.
- **Moods aren't counted anywhere yet.** Step 15's readout wants "Mood across the month", and `tally` deliberately ignores them for now. It's one more pass over the same loop when that step arrives.
- **`react-day-picker` is the first dependency added since Step 8**, and it exists for one control. Worth a look at bundle cost when Step 17 builds for production.

**Next:** Step 13 — the Life Star.

---

## 2026-08-21 · Step 11 · Highlight mode

**Decisions**

- **The selection lives in `useState` in `CalendarBoard` and nowhere else — no row, no URL, no `localStorage`.** This is the step's whole subject, so it's worth saying what makes it obvious rather than treating it as obvious: the test is whether the value should survive someone else opening the app, or a refresh, or a link being shared. A highlight is a way of *looking* at a month. It has no meaning tomorrow, it isn't part of what happened, and a refresh that restored it would feel like the app had gotten stuck. Everything the app stores answers "what happened"; this answers "what am I looking at", and those go in different places.
- **`selection` is identity; `highlight` is derived with `useMemo`.** `selection` is three fields naming a thing (`{kind, activityId}` / `{kind, areaId}` / `{kind, mood}`). Everything visible — the set of ids, the colour, the label — is computed from it plus the library on each render. So renaming or recolouring a sticker on the server changes what the highlight says with no code, and nothing has to watch for a selected sticker being archived: `buildHighlight` returns `null` and the page is simply not lit. Storing the resolved thing would have needed an invalidation rule; deriving it has none to get wrong.
- **An area and a single sticker leave `buildHighlight` as the same shape.** Both become `activityIds: ReadonlySet<string>` — an area's is just bigger. That's the reason `dayMatches` is four lines and `DayCell` has no branch for "is this an area highlight": the union exists at the point of *selection*, and is gone by the point of *drawing*. The alternative — passing the kind downward — would have put the same two-way branch in the cell, the mark wrapper, and the label builder.
- **Matching is on `activityId`, never the placement `id`.** A `day_activities` row has its own uuid; the sticker it draws has another. They're both called "id" in nearby code and Step 7 already separated them on purpose. `lib/highlight.test.ts` builds every fixture with `id: placement-${activityId}-${day}` so the two can never coincide — a fixture where they matched would pass whichever one the code got wrong.
- **The grid answers `lit`, the cell answers `selected`.** Two questions, deliberately split by who already has the data. "Does this day match?" needs the day's stickers, which `MonthGrid` already has in hand from its one `Map` lookup — so it calls `dayMatches` there and passes a boolean. "Is *this particular mark* the selected one?" is per-sticker, and pushing it up would mean handing every cell an array. The cell gets the `Highlight` object for that, and asks it directly.
- **Recede rather than emphasise, at `opacity-35`** — chosen over a brighter/ringed treatment. Nothing about the selected marks changes at all; the rest step back. But the fade stops at the marks: the numerals, the today ring, and the grid lines stay full strength. Fading the calendar's own skeleton would mean every selection costs you the ability to read a date, and the feature is supposed to be something you *look through*, not a mode you leave to get your calendar back.
- **The wash is a `-z-10` layer inside an `isolate` stacking context.** Two failures ruled this: an opaque `bg-ramp-red-soft` painted in front hides the very stickers it's pointing at, and a translucent `bg-ink/10` painted directly onto the cell shows the grid's hairline colour through it. A negative z-index paints *after* the element's own background and *before* its in-flow children, which is exactly the slot a wash wants; `isolate` on the button is what keeps it from escaping and painting behind the grid. It stays a separate element from the `isOver` drop layer, which has no z-index and genuinely should read on top of the marks. **Stated cost:** `hover:bg-ink/2` barely reads under an opaque tint on a lit cell. The tint is louder feedback than the hover was, so it stands in for it.
- **One `wash(colorKey)` in `lib/palette.ts`, used by the day cell, the tray row, and the area label.** Same argument as `validateDraft` in Step 10: three call sites means three chances to drift, and here drift is visible — the row you clicked would be a slightly different colour from the days that lit up. `null` means ink at 10%, which is what a mood gets, because moods are drawn colourless everywhere in this app precisely so they never compete with the six area hues.
- **Moods are selectable; "Mood" as a heading is not.** Clicking Happy lights every day you were happy, in ink. But the group's label names five separately selectable things rather than one thing, so it gets no `onSelect` and stays a plain `<h3>` — a heading that lit nothing would be a control that does nothing. Where an area label *is* clickable, the `<button>` goes **inside** the `<h3>` rather than replacing it, so the tray's structure survives for anyone navigating by headings.
- **Space lifts, Enter selects.** dnd-kit's `defaultKeyboardCodes.start` is `["Space", "Enter"]` and the activator calls `preventDefault()`, so with the default a keyboard user could never reach a highlight at all — the sensor eats the key first. Narrowed `keyboardCodes.start` to `["Space"]`, which is also what dnd-kit's own screen-reader instructions describe ("press the space bar"), leaving Enter free. Then extended `screenReaderInstructions` so the second half is discoverable, because a feature made entirely of colour does not exist for someone who can't see it.
- **A lit day says so in its `aria-label`** — `dayLabel` appends "highlighted for Meditation". Same reason as the sensor decision: the tint is the entire feature and it is pure colour.
- **Three ways out, because a mode with no visible exit is a trap.** Click the lit row again (`toggle` in the tray), the "clear" link in the header line, or Escape. The row can be scrolled off the bottom of a long rail and Escape is invisible, so the header line earns its keep: while something is lit it reads `Showing Meditation · clear`. The Escape handler is bound only while `selection && !openDay`, so it never competes with the modal's own.
- **The tray stayed presentational.** It renders the selection it's handed and reports clicks upward; it doesn't own the value, doesn't know which days are lit, and doesn't decide that clicking a lit row means "clear" — `toggle` calls `onClear`, and the board decides what that does. Same Step 7 seam, now covering "who remembers" as well as "who fetches".
- **`label` is a prop, not computed in the tray.** I wrote a `labelFor(selection, groups)` helper there first and deleted it: `buildHighlight` already computes that exact string to label the days, and a second implementation of "what is this thing called" is precisely the drift this project keeps refusing. The board passes `highlight?.label ?? null`.
- **ProjectPlan names `components/calendar/CalendarPage.tsx`, which doesn't exist.** No new file was needed — `CalendarBoard` is already the shared parent of the tray and the grid, because Step 8's drag needed exactly the same containment for exactly the same reason.

**Changed**

- `lib/highlight.ts` — new; `Selection`, `sameSelection`, `Highlight`, `buildHighlight`, `dayMatches`
- `lib/highlight.test.ts` — new; 27 cases
- `lib/palette.ts` — `wash(colorKey)`
- `lib/moods.ts` — deleted the dead `MOOD_RAMP`
- `components/dnd/CalendarBoard.tsx` — owns `selection`; Escape; `keyboardCodes`; `screenReaderInstructions`
- `components/calendar/MonthGrid.tsx` — calls `dayMatches`, passes `lit`
- `components/calendar/DayCell.tsx` — the wash layer, the per-mark fade, the label
- `components/dnd/DraggableSticker.tsx` — clickable, `aria-pressed`, three-way background
- `components/tray/TrayGroup.tsx` — optional clickable label; row selection
- `components/tray/StickerTray.tsx` — `toggle`, the header line, the clear link
- `learning/README.md` — Step 11 card, ten new symptom rows

**Also**

- **dnd-kit already prevents a drag from also firing a click — verified in `core.cjs.development.js`, not assumed.** `handleStart()` registers a capture-phase document `click` listener that calls `stopPropagation` once the activation constraint is met. So the 4px `PointerSensor` distance is the whole separation between "clicked a sticker" and "picked it up", and no ref-based "did I just drag?" guard is needed. That guard was the first thing I reached for.
- **`MOOD_RAMP` in `lib/moods.ts` had no callers and contradicted `MoodMark`'s own comment** ("No colour at all"). Deleted rather than used for the mood wash — a constant that says moods have colours, sitting unused next to a component built on them not having any, is a trap for whoever reaches this file next.
- **`bg-ink/10` compiles to two rules**: an opaque `background-color: var(--ink)` and then `color-mix(in oklab, var(--ink) 10%, transparent)` inside an `@supports` guard. Grepping for the class and reading the first hit says "fully opaque", which is wrong. Same shape as the `bg-ink/5` and `bg-ink/6` already shipping since Step 7, so it's Tailwind's pattern rather than anything new here.

**State:** `npm test` 69/69 (up from 42), `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `-z-10`, `isolate`, `bg-ink/10`, `underline-offset-2`, `opacity-35`, `py-0.5`, and `bg-ramp-red-soft` reached the compiled CSS with real values — seventh time. Committed as `8b8760b`.

**Confirmed in the browser on 2026-08-22.** The keyboard path specifically, since that's the one the code changed out from under dnd-kit: tab to a tray row, Enter lights the days and Enter again clears them, Space still lifts the sticker for a drag. So the narrowed `keyboardCodes.start` does hand Enter back to the button without costing the drag its activator.

**Open**

- **Everything Step 10 left open is still open** — the Step 8 duplicate-drop no-op and failure line, `scripts/seed.sql`, and nothing being able to remove a sticker from the library.
- **The keyboard drag stays coarse (25px per arrow press), decided rather than deferred.** Step 10 said "decide at Step 11". The modal is the precise-editing door and it's fully keyboard-operable, so the cell-to-cell coordinate getter isn't being written. Reopen only if the modal stops being the answer.
- **A day lit by an area shows no sign of *which* sticker matched.** All the marks on it stay lit if they're in the area, which is correct, but a day matching one sticker out of six in that area looks the same as a day matching all six. Fine at a glance; possibly a Step 12 question if trends want it.

**Next:** Step 12 — aggregation and the range picker.

---

## 2026-08-21 · Step 10 · Making a sticker

**Decisions**

- **One `validateDraft` in `lib/stickers.ts`, called by the browser and by the Server Action.** ProjectPlan asks for "validation on both sides", which is usually two checks that agree on the day they're written and drift afterwards. Making it literally one exported function means the friendly check and the real check can't disagree, and the sentence the user reads is the same string either way. `readDraft(formData)` beside it is the other half: both sides start from `FormData`, so the client isn't validating a nicer shape than the server receives.
- **The Server Action re-validates, and that's not belt-and-braces.** A Server Action is a POST endpoint like any other — anyone can send this request without loading the page. The check in `createActivity` is the one that counts; the one in the browser exists so a typo doesn't cost a round trip and so a message can point at a field while you're still typing. Written down in the action's doc comment, because the temptation to delete "the duplicate" is real.
- **`lib/graphemes.ts` has zero imports, on purpose.** It's loaded by a Client Component, by a Server Action, and by `node --test`. Anything it imported would have to be safe in all three, so it imports nothing. Its header states the three answers to "how long is `🏋️`": `.length` is 3 (UTF-16 code units), `[...s].length` is 2 (code points), `graphemeCount` is 1 (what a person means by a character).
- **`lib/stickers.ts` imports `./graphemes.ts` — relative, with the extension.** The only value import in the file, and the comment above it says why: `lib/stickers.test.ts` loads the module under `node --test`, where nothing resolves `@/`. That alias belongs to the bundler and there is no bundler in that process. The type imports in the same file keep using `@/` and are fine, because they're erased. Same rule Step 9 found with `changes.test.ts`, now stated once and pointed at.
- **The "one character" rule cannot be a `CHECK` constraint, and that's what makes it worth testing.** Postgres's `length()` counts code points, so `length('🏋️')` is 2 — verified live, not assumed. Every other rule in this form pushes down into the schema: `NOT NULL` on name and mark, `unique (user_id, life_area_id, name)`, and the composite foreign key `(life_area_id, user_id)`. The grapheme rule is the one with nothing underneath it, so `validateDraft` and `graphemeCount` get 31 and 11 cases respectively while the constraints get none — they can't drift.
- **Still no ownership check on `life_area_id`.** Third time this reasoning appears (`lib/queries/`, `placeActivity`, here) and it stays the same: the row is written with the caller's own `user_id`, `activities` references `(life_area_id, user_id)` as a pair, so an area belonging to someone else has no row to point at. The action reads Postgres's refusal instead of asking first — `23503` becomes "That life area isn't one of yours."
- **Three SQLSTATE codes get their own sentence; everything else gets one line.** `23505` → the name is already used in that area, pointed at the name field. `23503` and `22P02` → the area isn't yours, pointed at the select. (`22P02` because a malformed uuid fails before the foreign key can, and to the person at the keyboard it's the same mistake.) Anything else is ours to fix and says "That sticker didn't save. Try again." The `field` on the result is `DraftField | null`; `null` prints the sentence without marking a box red.
- **`CreateResult` mirrors `PlaceResult` from Step 8** — a discriminated union returned, not thrown. A thrown error in an action reaches the client opaque and, inside a transition, takes down the calendar via an error boundary.
- **Nothing optimistic here, unlike a drop.** A new row's id is generated by the database and the tray keys on it, so an optimistic sticker would need an invented id — a second source of truth on screen for the length of a round trip. The only thing it would buy is a sticker appearing a beat sooner in a list you aren't looking at while the dialog is still open. `refresh()` brings the real one back in the same response as the `ok`.
- **`NewStickerForm` is two components in one file, and the split is the reset.** `NewStickerForm` owns nothing but `open`. Every field, the error, and the picker's state live in `StickerFields`, which Radix mounts on open and unmounts on close. So closing the dialog *is* clearing the form: no reset code, no effect watching `open`, no chance of reopening onto last time's half-filled draft or a stale error. The general shape: **when a container already controls mounting, put the state that should die with it inside.**
- **`useActionState`'s action is a client function that wraps the Server Action.** Three things fall out of that. The quick `validateDraft` runs with no round trip. "And then close the dialog" is a UI decision and lives on the UI side. And `createActivity` keeps a plain `(formData) => result` signature instead of the `(previousState, formData)` shape `useActionState` would otherwise impose on a server module — the previous state is only ever consulted in the wrapper, and there it isn't consulted at all.
- **No `maxLength` on the mark input.** The attribute counts UTF-16 code units, so `maxLength={1}` accepts `A` and truncates every emoji into half a surrogate pair. The rule is enforced by counting graphemes or not at all.
- **The emoji picker is a `Popover` nested inside the `Dialog`**, with 48 emoji roughly covering the six life areas. It's a starting point, not a keyboard — the input beside it still takes anything you can type or paste. Popover-inside-Dialog is the well-trodden Radix nesting (the focus scope stack handles it); Popover-inside-Popover is the fiddly one, which is part of why the form is a dialog. Every cell and the trigger carry `type="button"`, which is load-bearing: a `<button>` inside a `<form>` submits by default, so without it opening the picker posts a half-filled form.
- **`name="lifeArea"` on the Radix `Select`.** Checked in `@radix-ui/react-select/dist/index.mjs` rather than assumed: given a `name`, the component renders a hidden native `<select>` alongside the styled button (`isFormControl` / `nativeOptionsSet`), which is what puts the value in `FormData`. Without it the trigger is decoration and the field arrives empty.
- **A live preview above the fields, drawn by `TrayRowFace` and `StickerMark`.** The same two components that draw the sticker in the tray, on a day, and in the modal — so it's a preview in the literal sense rather than an impression of one. `aria-hidden`, because every word in it was typed into a field two inches below. Before an area is picked the circle shows `ramp()`'s fallback, which is what the grid would show for an unrecognised colour: one fallback, one appearance. *(Removed in "Step 16, revisited" at the top — the mark field itself became the circle. The fallback rule still holds; it just lives on the field now.)*
- **The area dots in the dropdown use the *full* ramp, not the soft end a sticker is filled with.** They're 10px across. Same "tint is perceived by area" reasoning as the two hover values, pointed the other way.
- **`LibraryGroup` gained `colorKey`, and the form takes its six areas from the tray's groups.** A second query for the same six rows is how the dropdown and the group labels end up disagreeing. Every sticker already carries a copy of its area's ramp, but an area with nothing in it has no sticker to borrow one from — hence the field on the group itself.
- **`lib/queries/lifeAreas.ts` deleted.** Written in Step 4 and never called; its only stated reason to exist was this step's form, which doesn't want it.
- **`firstGrapheme` moved out of `lib/user.ts` into `lib/graphemes.ts`.** A Step 3 note said it would become shared if anything else needed it. Something did, so it's the second caller rather than a second copy.
- **"Nothing here yet" in an empty tray group**, closing a Step 7 thread. An empty area was a bare label with a gap under it, which read as something failing to load; now that the `+` works it's a state you can be in on purpose and get out of. It's an `<li>` inside the `<ul>`, because an empty list with a paragraph beside it is a lie a screen reader repeats.

**Changed**

- `lib/graphemes.ts` — new; `graphemeCount`, `firstGrapheme`
- `lib/graphemes.test.ts` — new; 11 cases
- `lib/stickers.test.ts` — new; 31 cases
- `lib/stickers.ts` — `StickerDraft`, `DraftField`, `DraftCheck`, `NAME_MAX`, `readDraft`, `validateDraft`
- `app/actions/activities.ts` — new; `createActivity`
- `components/tray/NewStickerForm.tsx` — new; the dialog and the fields
- `components/ui/{input,label,select,popover}.tsx` — new (shadcn, unmodified)
- `components/tray/StickerTray.tsx` — the `+` is real; empty groups say so
- `lib/queries/activities.ts` — `LibraryGroup.colorKey`
- `lib/user.ts` — imports `firstGrapheme` instead of keeping one
- `lib/queries/lifeAreas.ts` — deleted
- `learning/README.md` — Step 10 card, seven new symptom rows

**Also**

- **React 19 resets a form after an action, and controlled inputs survive it — verified in the installed source, not from memory.** The concern was real: `<form action={fn}>` calls `requestFormReset` on the host form when the action settles (`startHostTransition` → `recursivelyResetForms` → `stateNode.reset()`), which on a validation failure would blank the fields while React still held the typed values. It doesn't, because `updateInput` in `react-dom-client.development.js` sets `element.defaultValue = value` on every commit — so `reset()` restores the controlled value rather than clearing it. The design stands with no change. Worth knowing which half of that pair does the work: an *uncontrolled* form in this position really does clear itself on a failed submit.
- **`.length` is not safe to use on emoji even in a test file.** The Edit tool couldn't match strings in `lib/graphemes.test.ts` containing variation selectors and combining marks. Rewrote the file with `Write`, hoisting each tricky character into a named constant with escapes — a test about counting characters shouldn't be ambiguous about which characters it contains — then confirmed the intended byte sequences survived by asserting on `.length` (a decomposed `é` at 2, the family ZWJ sequence at 8).
- **Shell `cd` persists between tool calls**, which briefly made `git rm lib/queries/lifeAreas.ts` look like the file had vanished. Absolute paths from here.

**State:** `npm test` 42/42, `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `outline-ink/40`, `border-dashed`, `border-hairline`, `bg-ink/5`, `grid-cols-8`, and `text-ink-muted` reached the compiled CSS with real values — sixth time. Committed as `7c0ddb2`.

**Confirmed against the hosted database, inside rolled-back transactions as the `authenticated` role** — same method as Step 9. The happy-path insert succeeded and came back with `mark: '🏋️'`, **`length() = 2`**, 7 bytes, `archived: false` — a live demonstration that Postgres calls a one-character mark two characters, which is the whole argument for keeping that rule in TypeScript. A second insert of the same name in the same area raised `23505 … activities_user_area_name_key`. An insert naming an area belonging to someone else raised `23503 … activities_life_area_id_user_id_fkey`, so the composite foreign key is doing the ownership check the action deliberately doesn't. Afterwards: 13 activities, no probe rows left behind.

**Confirmed in the browser, and the two stickers are in the database.** "Visualizations" (`✨`) and "Grounding" (`🕯️`), both in Spirituality, both `archived: false`, written 13 seconds apart — so the emoji picker, the `name` on the Radix Select, the insert, and `refresh()` all work end to end, and `activities` is 15 against the 13 before the pass. `🕯️` is the better half of the evidence: it's a candle plus U+FE0F, so it's 7 bytes and Postgres calls it **`length() = 2`** while the form accepted it as one character. The rule that couldn't be a `CHECK` constraint, demonstrated by a real sticker rather than a probe.

**Open**

- **Still unconfirmed from Step 8:** the duplicate-drop no-op and the failure line.
- **`scripts/seed.sql`** — still in place, still undecided, now weaker again: the form makes the thirteen starter activities reproducible by hand. Decide with the Step 6 question about trigger-seeding them.
- **Keyboard drag is still coarse** (25px per arrow press). The modal is the precise-editing door; leaning toward not writing the cell-to-cell coordinate getter at all. Decide at Step 11.
- **Nothing removes a sticker from the library.** The form only adds. `archived` is in the schema, defaults false, and is already filtered on in `getStickerLibrary()` — but nothing sets it, and no step in the plan does. A sticker made by mistake is permanent right now.

**Next:** Step 11 — highlight mode.

---

## 2026-08-19 · Step 9 · The day modal

**Decisions**

- **`CalendarChange` in `lib/changes.ts` — one union naming everything that can happen to a day.** This is the whole step. ProjectPlan calls it "two doors, one room" and warns the two can drift; a union plus a single `commit()` in `CalendarBoard` makes drifting impossible rather than discouraged. A drag builds one of these, the modal builds one of these, and from there the *same* function does the optimistic redraw, calls the matching action, and reports the failure. The modal contains no rule about what a change means and no knowledge of which action it just caused. Four kinds: `place`, `remove`, `mood`, `clearMood`.
- **`withDrop` became `applyChange`, moved into `lib/changes.ts`, and `handleDragEnd` shrank to a translation.** The old reducer took a drag payload — a shape that only exists because dnd-kit produced it — so the modal could not have reused it without pretending to be a drag. Now the reducer takes a `CalendarChange` and the drag handler's only job is turning `{active, over}` into one. `runChange` is the other half: a four-case switch that is the single place a change is matched to an action.
- **No-op branches return `byDay` itself, not a copy.** `remove` on a day that doesn't have the sticker, `clearMood` on a day with no mood. Returning the same Map reference means React sees nothing changed and every `DayCell` skips its render. A fresh `new Map()` with identical contents would redraw all 42.
- **`DayModal` holds no state at all.** The checkboxes and the radio are controlled by the optimistic Map that `CalendarBoard` already owns. Local state would be a second copy of the truth that has to be synced back, and it would visibly disagree the moment a write failed and the optimistic value expired. Reading straight from the prop means a rolled-back sticker un-ticks its own box with no code to do it — which is the argument for controlled inputs, stated as a consequence instead of a rule.
- **`day: DayString | null` is both "which day" and "open".** One value, so the two can't disagree — no `open` boolean to leave true while `day` is null.
- **A sixth radio, "No mood", which is not a sixth mood.** ProjectPlan asks for a five-way picker and stops there. But "no mood" is the state most days are in, and a picker that can reach every state except that one makes a mis-click permanent. `value={stickers.mood ?? NO_MOOD}` maps "no row" onto it; choosing it deletes the row. This is also what makes the radio genuinely controlled — an uncontrolled one would reset to whatever was last chosen.
- **`removeActivity` deletes by `(day, activity_id)`, not by the `day_activities` row id.** The modal knows which *activity* a checkbox stands for; it has no placement id to hand, and `unique (user_id, day, activity_id)` guarantees at most one row to match anyway. Step 7 threaded `ActivitySticker.id` through for this and it turned out not to be the handle the modal wanted. Neither delete carries `.eq("user_id", …)`, for the Step 4 reason: the DELETE policies are `(select auth.uid()) = user_id`, so Postgres has already narrowed to your rows.
- **`DayCell` became a real `<button>`.** It has to be tab-reachable, fire on Enter and Space, and announce itself as something that does something — all free and correct on a button, none of it free on a div with an `onClick`. Nothing inside it is interactive, so there are no nested controls: the stickers are drawings, and editing them is what the modal is for.
- **One `aria-label` for the whole cell, replacing the contents.** As a container, letting the numeral, each sticker, and the mood carry their own names was right. As a button those get concatenated into its name and "20 Gym Meditation Great" is not a sentence. `aria-label` takes precedence over contents, so `dayLabel()` writes the sentence instead: *"Thursday, 20 August 2026. Gym, Meditation. feeling great"*, or `". empty"` when there's nothing on it.
- **The focus ring is an outline pulled inward** (`focus-visible:-outline-offset-2`), not a ring. The grid clips its children — `overflow-hidden` is what makes the 1px hairlines — so a ring drawn outside the cell's box gets shaved off along every shared edge.
- **The cell carries `flex flex-col justify-start`, which is a correction rather than a layout.** Turning the div into a button vertically centred the date and stickers: centring its own contents is built into how a browser lays a button out, and `display: block` does not turn it off. `min-h-32` makes every cell taller than its contents, so it showed on every day at once. Declaring a real layout replaces the built-in one; `items-stretch` keeps the date row full width so the mood stays pinned right. General shape: **when a container becomes a control, check its layout, not just its behaviour** — the element's own default styling changed underneath.
- **The dialog's focus trap, Escape, click-outside, focus return, `aria-modal`, and page inertness are all Radix's**, in `components/ui/dialog.tsx`. Read it once: it is a lot of behaviour, genuinely hard to get right by hand, and it's our file now. `DialogContent` defaults to `sm:max-w-sm`, which is sized for a confirm prompt; the modal overrides to `sm:max-w-md` and scrolls its body vertically at `max-h-[60vh]`. Names truncate rather than widening the panel — same rule as the rail.
- **`TrayRowFace` draws the sticker in the modal too.** Third place it appears now (tray row, drag overlay, checkbox row) and still one component, so they cannot look different.
- **The first real test suite, and it covers exactly one function.** `node --test` with `node:test` and `node:assert` — both built in, so no dependency, no config, no transform. Node strips the types itself, which is why `changes.test.ts` imports `./changes.ts` with the extension and why nothing it touches may use a `@/` path: the alias is a bundler's idea and there is no bundler in that process. `applyChange` earned it by being the one piece of Step 9 holding a *second copy* of a rule the database also enforces — a mood replaces, a duplicate activity is a no-op — and a second copy of a rule is the thing that silently drifts. Fourteen cases, weighted toward the no-op branches and toward not mutating the input, since a mutation there corrupts the value `useOptimistic` rolls back *to*. Everything around it is either a library's (Radix's focus trap, React's transition) or a call to Postgres, which a unit test can only fake and therefore can only lie about. Step 5 said a real runner arrives when there's something worth mocking; this arrived for the opposite reason — a pure function worth checking with nothing to mock at all.
- **The tests were checked by breaking the code on purpose.** Three mutations — a duplicate `place` no longer short-circuiting, `place` pushing onto the incoming array, `clearMood` returning a fresh Map from its no-op branch — and each one turned the suite red. A fourth attempt failed to fail, which turned out to be a bad mutant (`splice(0, 0)` removes nothing) rather than a gap. Worth doing once per suite: a test that cannot fail is decoration, and you can't tell by reading it.
- **Two hover values, not one.** The day cell washes to `bg-ink/2`; a tray row and a modal row use `bg-ink/5`. Same trick, deliberately different numbers — 5% reads as a light touch across a 28px band and as a grey square across a 150px cell. Tint is perceived by area, so the larger the surface the lower the number has to go to mean the same thing.
- **Modal rows are hover bands, matching the tray, and the negative margin is the interesting part.** A band has to extend past its text or the highlight looks clamped to the checkbox, but padding the row alone pushes every name right of the heading above it. So the row reaches back out (`-mx-2`) by exactly what the scrolling container pads in (`px-2`): text lines up with the heading and the dialog title, the band stops at the container's content edge rather than past it, and the two numbers are one decision — which is why they're two named constants in the file rather than four literals. Same constraint as the rail, for the same reason: `overflow-y: auto` promotes `overflow-x` to `auto` alongside it, so anything genuinely wider is a horizontal scrollbar. The list gaps dropped to `gap-0.5` to absorb the rows' new vertical padding, exactly as the tray's did in Step 8.
- **shadcn's `add` was run with `yes n |` piped in.** `--yes` does not cover the overwrite prompt, and the first attempt stalled asking to replace `button.tsx` — which is rethemed and carries our custom `icon-sm` size. Verified untouched afterwards. `checkbox.tsx` and `radio-group.tsx` carry `dark:` classes, which is fine: they resolve through `@custom-variant dark` in `globals.css`, and the rule against `dark:` is about *our* code.

**Changed**

- `lib/changes.ts` — new; the `CalendarChange` union and `applyChange`
- `lib/changes.test.ts` — new; 14 cases, the project's first tests
- `components/calendar/DayModal.tsx` — new
- `components/ui/{dialog,checkbox,radio-group}.tsx` — new (shadcn, unmodified)
- `app/actions/stickers.ts` — `removeActivity`, `clearDayMood`
- `components/dnd/CalendarBoard.tsx` — `withDrop` → `applyChange` and out to `lib/`, new `runChange` and `commit`, owns `openDay`, renders the modal
- `components/calendar/DayCell.tsx` — a button now, with `dayLabel()`
- `package.json` — `npm test`
- `components/calendar/MonthGrid.tsx` — threads `onOpenDay`, uses the shared `NO_STICKERS`
- `lib/stickers.ts` — gained `ActivitySticker`, `DayStickers`, `StickersByDay`, `NO_STICKERS`
- `lib/queries/stickers.ts` — trimmed to the one query
- `learning/README.md` — Step 9 card, four new symptom rows

**Also**

- **The build broke on a server module reaching the client bundle, and the cause is worth keeping.** `NO_STICKERS` started life in `lib/queries/stickers.ts` beside the query that produces it. Importing it from `CalendarBoard` pulled `lib/supabase/server.ts` — and through it `next/headers` — into a Client Component, and the build failed. The distinction: `import type` is erased at compile time and crosses the boundary freely, which is why the *types* had lived there harmlessly for three steps. A **value** import is real code, and it drags its entire module graph along. Fixed by moving the shapes and the empty value to `lib/stickers.ts` and leaving `lib/queries/` with nothing exported but the async function. Good rule: a module that touches `next/headers`, even two imports down, should export types and nothing else.

**State:** `npm test` 14/14, `tsc --noEmit`, `eslint .`, `npm run build` all clean. Committed as `adce207`.

**Confirmed in the browser, and `clearDayMood` is confirmed against the database.** 20 Aug went in carrying a mood and no stickers; afterwards `day_moods` is 37 rows against 38, and the row for that day is gone. So the DELETE reached Postgres and the RLS policy permitted it — the earlier rolled-back check as the `authenticated` role predicted this correctly.

**`removeActivity` is confirmed on screen but leaves no trace to check.** `day_activities` is 164 both before and after, with nothing on 20 Aug — which is exactly what ticking a sticker and unticking it produces, and also exactly what doing neither produces. A delete that works erases its own evidence. If it ever wants a harder proof the method is to tick, check for 165, then untick and check for 164 — two queries around one action rather than one query after both.

**Open**

- **Still unconfirmed from Step 8:** the duplicate-drop no-op and the failure line. Ticking a box for a sticker already on the day now exercises the same `ignoreDuplicates` path from a second direction.
- **`scripts/seed.sql` is still in place**, and the reason to keep it just weakened: `seed:reset` was the only way back to an empty calendar, and the modal now removes stickers one at a time. Decide with the Step 6 question about whether the thirteen starter activities become trigger-seeded app data.
- **Keyboard drag is still coarse** — 25px per arrow press, ~6 to cross a cell. The modal is now the precise-editing door ProjectPlan promised, so a cell-to-cell coordinate getter may not be worth writing at all. Decide rather than leave open.

**Next:** Step 10 — creating your own stickers.

---

## 2026-08-18 · Step 8 · Drag and drop

**Decisions**

- **`@dnd-kit/core` 6.3.1, not `@dnd-kit/react` 0.5.** The 0.5 line is the next-generation rewrite with a different API; 6.3.1 is the stable release and it's the one whose vocabulary ProjectPlan teaches — `DndContext`, `useDraggable`, `useDroppable`, `{active, over}`, `DragOverlay`. One package, no `@dnd-kit/sortable` (nothing here reorders) and no `@dnd-kit/utilities` (the overlay does the moving, so no transform to apply by hand).
- **`CalendarBoard` exists because `DndContext` has to contain both ends of a drag.** The tray and the grid were siblings under a Server Component with nothing above them but layout, so the layout is what moved. Consequence, and it's the real cost of the step: the two-column arrangement, `StickerTray`, and `TrayGroup` are all in the client bundle now. `CalendarView` is down to the two queries — which is the half of the Step 7 seam that was worth keeping.
- **`refresh()`, not `revalidatePath()`.** New in Next 16 (`next/cache`), and the right one here: the page has no Next cache entry to invalidate — it reads cookies and queries Postgres every request. What's stale is the rendered tree the browser holds. `refresh()` re-runs the route server-side and ships the new RSC payload back in the *same* response as the action's return value. `revalidatePath` would have worked by accident, via a cache that isn't there.
- **`useOptimistic`, so the rollback isn't code.** It takes the server's Map plus a reducer and returns a Map including drops still in flight. When the transition ends it stops overriding and falls back to the prop — by then either the server's new answer or, on failure, exactly what was there before. Nothing restores anything; the lie just expires. Requires `applyDrop` to be called *inside* `startTransition`, which is how React knows when that is.
- **The actions return `{ok, message}` rather than throwing.** A thrown error in a Server Action reaches the client opaque, and inside a transition it hits an error boundary — the calendar would come down over a failed sticker. Returned, it's a value the tray can render as one sentence. `useOptimistic` still rolls back, because the transition ends either way.
- **`ActivitySticker` gained `activityId`.** Step 7 kept the two ids separate on purpose; this is the step that needed both, and it turned out to need them *at once*. A drop has to ask "is this sticker already on this day?" and the placement `id` can't answer — two placements of the same activity have different ids by definition. Without it the optimistic redraw adds a duplicate circle and the refresh takes it away a moment later.
- **Both actions upsert; only one replaces.** `day_moods` conflicts on `(user_id, day)` and overwrites — that's "mood replaces mood" as one statement, no read-then-decide-then-write and no race between them. `day_activities` conflicts on `(user_id, day, activity_id)` with `ignoreDuplicates`, so a second drop of the same sticker is a no-op rather than an error the UI has to explain. Same verb, two conflict behaviours, both already guaranteed by Step 4's unique constraints.
- **No ownership check on `activity_id` in the action.** Deliberate, and the same reasoning as `lib/queries/`: the row is written with the caller's own `user_id`, and `day_activities` references `(activity_id, user_id)` as a pair, so an id belonging to someone else has no row to point at and Postgres rejects it. A check here would imply the safety lives in this file. Identity itself does come from `getUser()` on the server — an action is a POST endpoint, and the drag handler in front of it is a convenience, not a gate.
- **`pointerWithin` with `closestCenter` as the fallback.** `closestCenter` compares the *dragged item's* centre to each day's, and the overlay is a whole tray row — its centre can sit 100px from the cursor, lighting the wrong square. `pointerWithin` asks the only question a mouse user is asking. But a keyboard drag has no pointer and would return nothing forever, so it falls through. One line, and both input methods get the rule that suits them.
- **`useDroppable` inside `DayCell`, not a wrapper.** dnd-kit measures a box; a wrapper needs one, and a box between the grid and its cells is exactly what breaks the layout. (`display: contents` has no box to measure, so it's not an escape.) The day string is the droppable id, which is why `over` alone says where a sticker landed.
- **The drop highlight is its own layer, tinted `bg-ink/6` with a `border-ink/40`.** It has to sit *over* the cell's own colour — a cell borrowed from next month is sunken and should still read as targeted — so it can't be a swapped background class. Ink at low opacity is one declaration correct in both themes: dark ink darkens the cream, light ink lightens the charcoal. Same trick as the scrollbar thumb.
- **`TrayRowFace` split out of `TrayRow`.** Two places draw the circle-and-name pair now — the row in the tray and the copy following the cursor — and a lifted sticker that doesn't match the one you grabbed reads as a different object. The only way to guarantee they match is for them to be the same component.
- **The tray row is a real `<button>`.** `useDraggable`'s `attributes` include `tabIndex` and `aria-roledescription`, and its `listeners` cover keyboard as well as pointer; none of that works on something that can't hold focus. It stays a button in Step 9 when clicking one will mean something. `touch-none` is load-bearing — without `touch-action: none` the browser claims the gesture for scrolling before dnd-kit sees enough of it.
- **`TRAY_INSET` in `lib/layout.ts` — the whole rail shares one horizontal inset.** Took three tries, and the middle one is the lesson. A tray row is a hover-and-drag band, so it needs padding inside its edges or the highlight starts exactly where the circle does and looks clamped to it. But padding the row alone pushes every sticker right of the label naming it, and cancelling that with `-mx-1` put 4px of every row *outside* the rail — which is a horizontal scrollbar, because **`overflow-y: auto` does not leave the other axis alone**: CSS promotes `overflow-x` from `visible` to `auto` alongside it. (`overflow-x-hidden` would have masked that rather than fixed it.) The resolution is that the padding can't belong to the row. The header, every group label, every row, the error callout, and the drag overlay all carry `TRAY_INSET`, so text starts at one x, filled things still span the rail edge to edge, and nothing reaches past it. Five files have to agree, which is why it's a constant — same reasoning as `PAGE_WIDTH` one level up. The `<ul>` gap dropped to `gap-0.5` to absorb the row's new vertical padding.
- **`DndContext` carries an explicit `id`, and it is not optional.** Found by a hydration warning in the console. dnd-kit stamps every draggable with `aria-describedby="DndDescribedBy-N"`, where N comes from `useUniqueId` — a counter in a *module-level variable* (`@dnd-kit/utilities`). On the client that module is fresh each load, so N starts at 0. On the server the module is cached for the life of the Node process, so N climbs with every request: the second render of the page sends `-1`, the third `-2`, and hydration finds an attribute it didn't compute. Passing an `id` of our own makes dnd-kit use it verbatim instead of counting. The live region is safe already — it's gated behind a `mounted` flag and renders nothing on the server — so the tray rows were the only leak. General shape worth keeping: **anything SSR-rendered whose value comes from a counter rather than from the data will drift**, because the two sides don't share the counter.
- **`activationConstraint: { distance: 4 }`** so a press has to travel before it counts as a drag. Step 9 wants that click.
- **Custom `announcements`.** dnd-kit announces by default but only knows ids, and ours are uuids and `2026-08-12` — the default reads out the uuid. Needed `formatDayLong()` in `lib/dates.ts`, built on `parse` rather than `new Date(day)`, which parses as UTC midnight and is the previous evening in California.
- **The error line is a live region rendered always, filled sometimes.** A `role="status"` that only enters the tree when it gains text often doesn't announce — it has to be there beforehand for the change to be a change. `empty:hidden` keeps it out of the layout meanwhile.
- **The tray's `+` became a drawn icon.** It was a `"+"` character and sat visibly low in its round button. Flex centres a glyph's *line box*, not its ink, and a serif plus rides the font's math axis below the middle of that box. A nudge would have been a magic number true only for EB Garamond at one size — and wrong again during the font swap, while Georgia with different metrics is standing in. Same reasoning that already made `MoodMark` an SVG: a mark that has to sit centred should be geometry, not typography.
- Verified `bg-ink/6`, `border-ink/40`, `bg-ramp-red-soft`, `empty:hidden`, `touch-none`, `opacity-35`, and `px-2` reached the compiled CSS with real values rather than assuming. Fifth time this category has come up.

**Changed**

- `app/actions/stickers.ts` — new; `placeActivity`, `setDayMood`
- `components/dnd/{CalendarBoard,DraggableSticker,payload}.tsx|ts` — new
- `components/views/CalendarView.tsx` — down to two queries and one child
- `components/tray/StickerTray.tsx` — now `"use client"`, passes drag payloads, `+` is a lucide `Plus`
- `components/tray/TrayGroup.tsx` — `TrayRow` is draggable; `TrayRowFace` split out
- `components/calendar/DayCell.tsx` — droppable, with the over-highlight layer
- `lib/queries/stickers.ts` — `ActivitySticker.activityId`
- `lib/dates.ts` — `formatDayLong()`
- `lib/layout.ts` — `TRAY_INSET`
- `package.json` — `@dnd-kit/core`; the three Supabase scripts pinned to `supabase@2.115.0`
- `learning/README.md` — Step 8 card, six new symptom rows

**State:** `tsc --noEmit`, `eslint .`, `npm run build` all clean. Dev server starts, `/` still 307s to `/login` signed out.

**Placing a sticker is confirmed against the real database.** Four rows written from the browser on 19 Aug between 21:42 and 22:08 — Meditation on 31 Jul, 1 Aug, and 19 Aug, then Gym on 19 Aug. Two of them land on the same day, so more than one sticker per day works. `day_activities` is now 159 rows against the seed's 155, and both unique constraints still hold across the whole table: no day carries the same activity twice, no day carries two moods.

**The mood path is confirmed too, both halves.** Great onto 20 Aug — a day the seed skips — inserted row 38 in its own transaction. Rough onto the same day then *replaced* it: value changed, `created_at` unchanged, `xmin` advanced, total still 38, and zero days anywhere carry two moods. Same row rewritten, which is `on conflict (user_id, day) do update` doing the work that "mood replaces mood" would otherwise be a branch for.

**Method note, worth more than the result.** The first check for mood writes filtered on `created_at` and found nothing, which looked like the feature was dead. It wasn't — **an `UPDATE` doesn't touch `created_at`**, so a mood replacing a mood is invisible to that query, and most days already had a seeded mood. `xmin` — the transaction that last wrote a row version — is what actually answers "has anything written here since the seed", and it's what proved both that the bug was real and, later, that the fix worked. Reach for it before concluding a write path is dead.

**Still unconfirmed:** the duplicate-drop no-op and the failure line. Step 7's tray is confirmed by implication — every one of these drags started from it.

**Open**

- **Nothing removes a sticker yet.** `ActivitySticker.id` is the handle for it and is threaded through; Step 9's modal is where it gets used. Dragging one *off* a day isn't in the plan and isn't built.
- **Keyboard drag works but is coarse.** dnd-kit's default keyboard coordinate getter moves 25px per arrow press, so crossing a ~150px cell takes six. Functional and announced correctly, but Step 9's modal is the real precise-editing door — check whether a custom coordinate getter that steps cell to cell is worth it once the modal exists.
- **`ProjectPlan.md` says to delete `scripts/seed.sql` once Step 8 works.** Left in place — placing works now, but `seed:reset` is still the only way back to an empty calendar, and nothing in the UI removes a sticker until Step 9. Revisit then, together with the Step 6 question about whether the thirteen starter activities become trigger-seeded app data.

**Next:** Step 9 — the day modal. Same server actions behind a second door, so the two can't drift.

---

## 2026-08-18 · Step 7 · The sticker tray

**Decisions**

- **The tray owns no data.** `StickerTray` takes a finished list and renders it; `CalendarView` does the fetching. That seam is the point of the step, and it's what lets Step 8 wrap the tray in a drag context without touching any loading.
- **One `StickerMark`, no variant prop.** It now takes `StickerFace` — name, mark, colour, the three fields it draws — instead of a row from either table. The tray and a day cell pass different things that both satisfy it.
- **The ids stay separate.** `ActivitySticker.id` is a `day_activities` row (one placement); `LibrarySticker.id` is an `activities` row (the sticker itself). Same shape on screen, different meaning, and Step 8 needs both: it drops by activity id and removes by placement id. Merging them would have been a bug that typechecks.
- **`getStickerLibrary()` queries downward from `life_areas`,** with `activities(...)` embedded. One query instead of two, grouping for free, and an area with no stickers still comes back — with an empty array. Six labelled groups is what shows the six areas exist before you've made a single sticker. `.eq("activities.archived", false)` filters the nested rows; `!inner` on the embed is what would drop areas instead.
- **Names, not just marks.** ProjectPlan had marks in a wrapped row; you asked for full names in the rail. So each group is a vertical list of circle + name, which makes the tray the legend too.
- **`LifeAreaChips` deleted.** The tray's group labels are the life areas now, so the chips were a second, quieter version of the same information. `getLifeAreas()` is kept — Step 10's form needs it to pick an area.
- **The rail scrolls on its own** (`lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`) and went `w-64` → `w-72` to fit names. Otherwise a long list makes the page taller than the calendar it sits beside.
- **`TrayRow` hides the visual from screen readers.** Both marks carry their own accessible name, which is right on the grid where no text sits beside them — here it'd be read twice.
- **The `+` is present and disabled.** Step 10 fills it in; having it now settles the header's proportions.
- **Groups lie in a grid, and only the column count changes between the two places the tray lives** — 2/3/4 columns below `lg`, one in the rail. Stacked under the calendar, a single 18rem column would be a thin ribbon with the page empty either side. The stickers inside a group stay vertical, so a label always sits directly above what it names.
- **`color-scheme` declared on both themes.** It's what tells the browser which way its own furniture leans — scrollbars, form controls, the ground painted before our CSS lands. Without it a dark page kept a light scrollbar. Then `scrollbar-width: thin` and a `--ink` -at-35% thumb on `html`; both properties inherit, so every scrolling box gets them without a class. (Invisible on a Mac unless scroll bars are set to "Always".)
- **`@utility eyebrow` for the small letterspaced caps,** with a new `--ink-label` token between `--ink` and `--ink-muted`. Two things at once: the labels were fading out — caps set small and spaced apart lose contrast twice over, so `--ink-muted` is legible in a sentence and faint in a label — and the five copies of the same four classes had already drifted to three font sizes and two tracking values. Size lives in the utility so the family stays a family. Dark's value goes *lighter*, as the pastels did.

**Changed**

- `lib/stickers.ts`, `lib/queries/activities.ts` — new
- `components/tray/{StickerTray,TrayGroup}.tsx` — new (`TrayGroup` also exports `TrayRow`)
- `components/calendar/StickerMark.tsx` — takes `StickerFace`
- `components/views/CalendarView.tsx` — fetches the library, renders the tray
- `components/LifeAreaChips.tsx` — deleted
- `app/globals.css` — `color-scheme`, themed scrollbars, `--ink-label`, `@utility eyebrow`
- `components/calendar/MonthGrid.tsx`, `components/views/Placeholder.tsx`, `app/login/page.tsx`, `app/auth/auth-code-error/page.tsx` — onto `eyebrow`
- `learning/README.md` — Step 7 card, three new symptom rows

**State:** `tsc --noEmit`, `eslint .`, `npm run build` all clean. Not yet confirmed in the browser.

**Open**

- ~~**The Supabase CLI stopped authenticating.**~~ Resolved 19 Aug: `supabase login` re-run, and the three scripts now pin `supabase@2.115.0` instead of letting `npx` float onto whatever is newest.
- ~~The `life_areas → activities` embed hasn't run against the database.~~ Resolved 19 Aug: the anon request returns HTTP 200 `[]`, so PostgREST resolved the relationship and the nested `archived` filter — a malformed embed or an ambiguous relationship is a 400 with a hint, not an empty array. The `[]` itself is RLS, same signature as Step 4.
- Empty life areas render as a bare label with nothing under it. Fine while seeded; decide by Step 10 whether it wants "Nothing here yet" text.

**Next:** Step 8 — drag and drop.

---

## 2026-08-18 · Step 6 · Stickers on their days

**Decisions**

- **`Map<DayString, DayStickers>`, built once on the server.** The grid renders 42 cells and each asks "what's on this day?" — against an array that's 42 passes over every row you own; against a Map it's 42 lookups and one build pass.
- **Fetch every sticker, not one month.** A few years of daily use is a few thousand rows, smaller than the JavaScript on the page, and it means arrowing to September needs no round trip. Revisit at five figures; the fix is a date range on both queries and nothing above changes.
- **A day is `{ activities: [], mood: null }`, not a flat list.** That asymmetry is `unique (user_id, day)` written into the type. A `Mood[]` would leave every reader deciding what two moods on a Tuesday means, for a state the database can't produce. Replaced an earlier discriminated union, which stopped fitting once the mood moved out of the sticker row.
- **Generated database types.** `lib/database.types.ts` from `npm run types:db`, passed to both Supabase clients. Without it the client can't tell a many-to-one join from one-to-many and types an embedded single row as an array. Regenerate after every migration.
- **Two queries in `Promise.all`.** The page waits for the slower one rather than the two end to end. Same in `CalendarView` for areas + stickers.
- **Stickers are the soft end of the ramp, mark always `--ink`.** Six saturated circles shout over the date they annotate. Keeping the mark on `--ink` means legibility never depends on the fill being light enough for white — the Step 5 trap, avoided by construction rather than by picking good values.
- **The mood is not a sticker, so it doesn't look like one.** Outlined face in plain ink, no colour, sitting on the date's own line at the top-right; activities are filled pastel circles wrapping below. Different shape, weight, and position. The five moods are distinguished by mouth alone, so they work in greyscale and never compete with the six area hues.
- **Right rail at `lg`, stacked below it.** Page container went `max-w-5xl` → `max-w-7xl` so the grid keeps roughly its width once the rail takes 16rem. The rail is sticky under the nav — it becomes the drag source in Step 8.
- **`PAGE_WIDTH` in `lib/layout.ts`.** The gutter was duplicated in `AppShell` and `TopNav`; if those drift the wordmark stops sitting above the calendar's left edge.
- Sample data is SQL run through `npx supabase db query --linked`, which uses the CLI's own auth. No `service_role` key had to be created or stored.

**Changed**

- `lib/queries/stickers.ts`, `lib/moods.ts`, `lib/layout.ts`, `lib/database.types.ts` — new
- `components/calendar/{StickerMark,MoodMark}.tsx` — new
- `components/calendar/{DayCell,MonthGrid}.tsx` — render and thread the stickers
- `components/views/CalendarView.tsx` — two-column, both queries in parallel
- `components/{AppShell,TopNav}.tsx` — shared `PAGE_WIDTH`
- `components/LifeAreaChips.tsx` — vertical in the rail, soft dots matching the stickers
- `lib/supabase/{server,client}.ts` — typed with `<Database>`
- `lib/palette.ts`, `app/globals.css` — `--ramp-*-soft` for both themes
- `supabase/migrations/20260817120000_unique_activity_names.sql` — new
- `scripts/seed.sql`, `scripts/seed-reset.sql` — new; `package.json` gains `seed`, `seed:reset`, `types:db`
- `learning/README.md` — Step 6 card, five new symptom rows

**Also**

- **The seed script wasn't idempotent, despite its own comment saying so.** Running it twice gave 26 activities. `on conflict do nothing` catches a unique violation, and there was no unique constraint on activity names to violate. Fixed in the schema rather than the script: an activity name is now unique within its life area, which is a real rule — two circles both called "Gym" under Exercise are indistinguishable once they're on a day. The migration dedupes first, re-pointing placed stickers at the survivor so no history is lost. Step 10's create-your-own-sticker form had the same hole.
- Verified the `bg-ramp-*-soft` classes and both hex sets actually reached the compiled CSS, rather than assuming. Fourth time this category has come up; checking it is now cheap.

**State:** `tsc --noEmit`, `eslint .`, `npm run build` all clean. Four migrations applied, local and remote lists match. Seed stable across runs at 13 activities / 155 placed / 37 moods. Calendar, pastels, mood faces, and the right rail all confirmed in the browser. Uncommitted.

**Open**

- Starter activities live in the sample-data script, per ProjectPlan's split between "required app data" (trigger) and "developer convenience" (script). But an empty tray is a poor first run, and Step 10 only *adds* to it. Decide before Step 17 whether the thirteen become trigger-seeded app data.
- `proxy.ts` builds its Supabase client without `<Database>`. It only calls `getUser()`, so no table types are involved. Add it if it ever touches a table.
- No keyboard navigation between cells. Still not needed until Step 8.

**Next:** Step 7 — the sticker tray. Presentational only; the same `StickerMark` renders in the tray and on a day, differing by props.

---

## 2026-08-12 · Step 5 · The month grid

**Decisions**

- **Always 42 cells, never 35.** A 31-day month starting on a Friday needs six rows, and a grid that changes height between months makes the page jump on every arrow press. February gets a row of greyed-out March; that's the price of a page that holds still.
- **The clock is passed in, not read during render.** `monthGrid(month, todayString)` takes today as a parameter. Calling `isToday()` inside would make the output depend on *where* it runs — the server is UTC, the browser isn't, and they disagree about the date for ~7 hours a day.
- **`useSyncExternalStore` for today, not `useEffect` + `setState`.** Third argument is the server-and-hydration value (`null`), second is the real browser value. Both render passes agree, so no hydration mismatch, and React's `set-state-in-effect` lint rule stays happy. `ThemeToggle.tsx` was converted to the same shape — it had the same bug and was already failing lint.
- **Days are `"2026-08-12"` strings outside `lib/dates.ts`.** `toISOString().slice(0,10)` converts to UTC first and is wrong about a third of the day; `format(date, "yyyy-MM-dd")` reads local calendar fields. Matches what `day_activities.day` stores, so no conversion at either end.
- **The 42 cells are derived from `month` every render, never stored.** One source of truth for what the grid shows.
- **Today is a ring, not a filled circle.** A fill needs the numeral inverted, and inverted text is one missing token away from invisible — which is exactly what happened (see below).
- **Hairlines are `gap-px` over a `bg-hairline` container**, not per-cell borders that double up at every seam.
- `data-day` on every cell now, though nothing reads it. Step 8's drop target needs it.
- **`scripts/check-dates.mts` instead of a test runner.** Date bugs are seasonal — the February one shows up in February. Plain Node, throws on failure. A real runner arrives when there's something worth mocking.
- Arrows sit in the header, pinned right. Tried flanking the grid; reverted after review.

**Changed**

- `lib/dates.ts` — new, every date decision in one file
- `components/calendar/{MonthGrid,MonthHeader,DayCell}.tsx` — new
- `scripts/check-dates.mts` — new, 18 assertions
- `components/views/CalendarView.tsx` — renders the grid above the chips
- `components/LifeAreaChips.tsx` — left-aligned now that the grid sets the column width
- `components/ThemeToggle.tsx` — `useEffect` → `useSyncExternalStore`
- `app/globals.css` — added `--color-bg` to `@theme`
- `tsconfig.json` — `allowImportingTsExtensions`, for `scripts/` only
- `package.json` — `date-fns`, `check:dates` script
- `learning/2026-08-12-05-month-grid-and-date-handling.html`

**Also**

- **The invisible today numeral, third sighting of the build-time-tools-read-text trap.** The class was `text-bg`, but `--color-bg` had never been published in the `@theme` block, so the utility didn't exist and the numeral inherited dark ink on a dark circle. An unknown Tailwind class isn't an error — it's nothing. Fixed both ends: exposed the token *and* switched to a ring so legibility never depends on a second token resolving. Same family as Step 3's `process.env.NEXT_PUBLIC_…` and Step 4's `bg-ramp-${key}`.
- `DayCell` picks exactly one class per slot via `numeralClasses()`. `text-ink` and `text-ink-muted` on the same element resolve by position in the compiled stylesheet, not by source order.
- `TZ=Pacific/Kiritimati npm run dev` (UTC+14) makes the hydration boundary visible: no today ring on the first frame, then it appears.
- **`learning/README.md` is now the doc you actually read** — five lines per step, one design consequence each, plus a symptom index (*if you see X, it's because Y*) and a declared floor of things to trust without understanding. The long `.html` docs stay as reference. Reason: a concept explained before you've felt the problem has nothing to stick to, so the docs should be indexed by symptom rather than by topic. Future steps get the card first; the long doc is optional.

**State:** `tsc --noEmit`, `eslint .`, and `npm run build` all clean. `check:dates` passes 18/18 in both `America/Los_Angeles` and `Pacific/Auckland`. Grid confirmed in the browser — arrows in the header, today's number visible inside its ring. Uncommitted.

**Open**

- `scripts/` isn't type-checked by the build (`.mts`, run directly by Node). It compiles under `tsc --noEmit` only because of `allowImportingTsExtensions`. Fine while it's one file.
- No keyboard navigation between cells yet. Not needed until cells are interactive in Step 8.

**Next:** Step 6 — seeded sticker rows appear on their days. Server-side fetch reshaped into a `Map<DayString, Sticker[]>` so each cell does one lookup instead of scanning the month.

---

## 2026-08-12 · Step 4 · Schema, RLS, and seeding

**Decisions**

- **Ramps renamed by hue; area tokens became aliases.** `--ramp-red` holds the value, `--area-spirituality` points at it. `color_key` stores `'red'`, so a seventh area picks a ramp instead of needing new CSS. Step 1 had this inverted. Nothing used the area classes yet, so the change was free.
- **`life_areas` gets no insert or delete policy.** Read and rename only. "Editing life areas is v2" is now enforced by the database rather than remembered.
- **No `.eq("user_id", …)` in `lib/queries/`.** RLS applies the filter inside Postgres. Duplicating it in the app would imply the safety lives in the query file, and then one forgotten line is a leak.
- **Composite foreign keys** — `(activity_id, user_id) references activities(id, user_id)`. RLS filters what you can read, not what you can *reference*; pairing the columns stops a row pointing at someone else's activity.
- `on delete restrict` on `life_area_id`, per ProjectPlan §2b. Retiring an area is the `archived` flag, not a delete.
- Seed trigger is `security definer` with `set search_path = ''`, so every name inside is written `public.*`. It has to run as the owner — the new user has no session and couldn't pass their own RLS check.
- Trigger file ends with `select public.seed_life_areas(id) from auth.users;` to backfill the account created in Step 3. Idempotent via `on conflict do nothing`.
- `(select auth.uid())` rather than bare `auth.uid()` in every policy — evaluated once per query instead of once per row.
- `lib/palette.ts` writes all six class names out by hand. `bg-ramp-${key}` compiles and produces no CSS; Tailwind scans text. Second sighting of the Step 3 `process.env` trap.
- No Docker on this machine, so local Supabase dev and `db dump` are unavailable. Pushing straight to the hosted project; accepted.

**Changed**

- `supabase/migrations/20260812090000_schema.sql` — four tables
- `supabase/migrations/20260812090100_rls.sql` — RLS enabled, 14 policies
- `supabase/migrations/20260812090200_seed_life_areas.sql` — trigger + backfill
- `supabase/config.toml` — from `supabase init`
- `lib/queries/lifeAreas.ts`, `lib/palette.ts`, `components/LifeAreaChips.tsx` — new
- `components/views/CalendarView.tsx` — now async, renders the chips
- `app/globals.css` — `--ramp-*` primitives, `--color-ramp-*` exposures
- `learning/2026-08-12-04-schema-rls-and-seeding.html`
- `components/ui/button.tsx`, `components/UserMenu.tsx`, `components/ThemeToggle.tsx` — `cursor-pointer`

**Also**

- **First hand edit to a shadcn file.** Tailwind v4 dropped `cursor: pointer` from its button reset, so nothing clickable showed the hand. Added `cursor-pointer` to `button.tsx`'s base variant rather than at each call site; the avatar trigger and theme toggle are raw `<button>`s and needed their own. `disabled:pointer-events-none` was already in the base string, so pending buttons stay correct. Until now the rule had been "theme shadcn through tokens, never edit the file" — this is the exception, and it's a bug fix rather than styling.

**State:** all three migrations applied to the hosted project, local and remote lists match. Anon request to `/rest/v1/life_areas` returns `[]` — rows filtered, not an error. Build clean, `/` still `ƒ`. Six chips confirmed in the browser. Uncommitted.

**Open**

- Verified RLS denies the anon role. Have *not* tested a second signed-in user reading the first user's rows — worth doing when there's a reason to create one.
- `components/views/Placeholder.tsx` still uses inline destructured props rather than the `type Props` house style. Left alone; convert when it's touched.

**Next:** Step 5 — the month grid. Sunday-start, oldstyle numerals, adjacent-month days sunk. Date maths only, no database.

---

## 2026-08-12 · Step 3 · Sign in

**Decisions**

- **`middleware.ts` does not exist in Next 16 — it's `proxy.ts`, exporting `proxy`.** Node runtime only; Edge can't be configured. Caught by reading `node_modules/next/dist/docs/` per `AGENTS.md`. `ProjectPlan.md` Step 3 said `middleware.ts`; corrected, along with the doc name.
- `getUser()` everywhere, never `getSession()`. On a server a cookie is just bytes the client sent; `getUser()` verifies with Supabase and triggers the refresh.
- `app/page.tsx` re-checks the user even though the proxy already did. Next's docs are explicit that proxy is an optimistic pre-filter, not an authorization boundary. Real guarantee lands in Step 4 as RLS.
- `setAll(cookiesToSet, headers)` takes **two** args in `@supabase/ssr` 0.12 — verified in the installed `.d.ts`, not from memory. The second carries `Cache-Control`/`Expires`/`Pragma`, which stop a CDN serving one user's session to another. The proxy returns the `response` that `setAll` rebuilt; returning a fresh `NextResponse.next()` would silently drop the refreshed cookie.
- Env vars read as literal `process.env.NEXT_PUBLIC_…` text in `lib/supabase/env.ts`. Next does find-and-replace at build time, so a `read(name)` helper would be `undefined` in the browser. Same class of bug as Tailwind's class scanning.
- Sign-out is a Server Action in a `<form>`, not a link. A GET endpoint can be fired by an `<img>` on someone else's page.
- `next` param in the callback is forced to a relative path — otherwise `?next=https://evil.example` hands over a freshly authenticated visitor.
- Publishable key in plaintext `.env.local` is correct: it's the `anon` role and ships in the bundle by design. `service_role` must never take a `NEXT_PUBLIC_` prefix.
- All three Supabase Data API toggles ON, including auto-expose — against Supabase's own hint. Automatic RLS closes the dangerous failure mode, and manual `GRANT` plumbing would muddy the Step 4 lesson. **Migrations are the source of truth; dashboard toggles are the safety net.**
- Avatar initial via `Intl.Segmenter`, not `name[0]` — emoji and accented names are multiple code units. Step 10's sticker marks need the same.
- `avatar` and `dropdown-menu` taken from shadcn **unedited**. They read `--popover`/`--accent`/`--radius`, which Step 1 already pointed at our palette, so the retheme was free. Only hand-written bit is `font-heading` on the fallback.

**Changed**

- `proxy.ts` — new, repo root
- `lib/supabase/{env,client,server}.ts`, `lib/user.ts` — new
- `app/login/page.tsx`, `app/auth/callback/route.ts`, `app/auth/auth-code-error/page.tsx`, `app/actions/auth.ts` — new
- `components/auth/SignInButtons.tsx`, `components/UserMenu.tsx` — new
- `components/ui/{avatar,dropdown-menu}.tsx` — new (shadcn, unmodified)
- `app/page.tsx` — now async, redirects when signed out, passes `user`
- `components/{AppShell,TopNav}.tsx` — thread `user` through; placeholder avatar → real menu
- `OAuthSetup.md` — new, three-console clickthrough
- `learning/2026-08-12-03-oauth-sessions-and-proxy.html`
- `.env.local` — new, gitignored, two `NEXT_PUBLIC_` vars

**State:** `tsc --noEmit` clean, build clean. `/` moved from `○` static to `ƒ` dynamic (reads cookies); `/login` stays static; Proxy registered. `curl /` → 307 → `/login` signed out. Google and GitHub round trips confirmed by hand. Committed together with Step 2's shell.

**Open**

- Google's consent screen reads "Sign in to hcomppydgxbearzqxslf.supabase.co" — Supabase is the registered OAuth client, so only a paid custom domain changes it. GitHub already shows the right name. Deferred to Step 17.

**Next:** Step 4 — four tables as migrations, RLS keyed on `auth.uid()`, seed the six life areas, render them as chips.

---

## 2026-07-30 · Step 2 · The shell

**Decisions**

- `app/page.tsx` stays a Server Component and passes both views into the client shell as props. Importing them would have dragged the whole calendar into the browser bundle; props cross the boundary as finished server output. Verified by grep.
- Tabs are real `<a href>` with `preventDefault`, not `<button>`. Costs one line, buys keyboard/screen-reader familiarity now and real URLs later if we want them.
- State lives in `AppShell`, not `TopNav` — the nav and the body both need it. `TopNav` owns nothing.
- `Page` type and `PAGES` list in `lib/nav.ts` rather than a component file, to keep the shell↔nav import from going circular.
- Segmented control hand-written. shadcn has no such primitive and it's two links and a rounded background.
- No page persistence and no history entries. Follows from "no browser navigation" in the spec; accepted.

**Changed**

- `components/AppShell.tsx`, `components/TopNav.tsx`, `lib/nav.ts` — new
- `components/views/` — `CalendarView`, `TrendsView`, `Placeholder` (all temporary)
- `app/page.tsx` — specimen sheet deleted, now three lines
- `learning/2026-07-30-02-app-shell-and-client-components.html`

**State:** builds clean, `/` still static. Client bundle confirmed free of view copy. Committed together with Step 3 — the two steps share `app/page.tsx`, so they couldn't be split cleanly.

**Next:** Step 3 — Supabase auth, Google + GitHub, the placeholder avatar becomes a real account menu. First `.env.local`.

---

## 2026-07-30 · Step 1 · Scaffold and design tokens

**Decisions**

- Theme via CSS custom properties, not Tailwind's `dark:` variant — one class name (`bg-surface`), two value sets. Zero `dark:` in our own code.
- Six area hues doubled as the five mood hues. Aliased with `var()` so dark overrides flow through for free.
- Dark hues lifted ~12% in lightness rather than reused. Contrast is a relationship, not a property.
- Blocking inline `<script>` in `<head>` sets the theme class before first paint. Normally an antipattern; here the alternative is a visible flash.
- Themed shadcn's Button by pointing `--primary` at our ink. `button.tsx` untouched.
- Graph-paper background cut after review — the calendar is already a grid.
- **Don't commit until asked.** Supersedes the per-step commit cadence in `ProjectPlan.md`.

**Changed**

- `app/globals.css` — token layer, light + dark, `.oldstyle` / `.tabular`
- `app/layout.tsx` — Cormorant + EB Garamond, theme bootstrap script
- `lib/theme.ts`, `components/ThemeToggle.tsx` — theme storage and toggle
- `app/page.tsx` — specimen sheet (deleted in Step 2)
- `learning/2026-07-29-01-scaffold-and-design-tokens.html`

**State:** builds clean, both routes static, both themes verified in the compiled CSS. Commits `f5a7ff6` and `6b01610`.

**Next:** Step 2 — top nav, segmented Calendar/Trends pill, page switching in React state. Toggle moves into the nav. Specimen page deleted.

---

## 2026-07-29 · Step 0 · Planning

**Decisions**

- Next.js App Router + React + TypeScript; Tailwind v4.
- Supabase for auth *and* Postgres — fewest moving parts.
- Auth early (Steps 3–4). Tradeoff accepted: config-heavy start.
- dnd-kit for drag and drop; hand-written SVG for charts.
- Learning docs live in-repo at `learning/`, one per step.
- Schema designed so user-editable life areas are possible later, but not built in v1: `color_key` names a ramp instead of a hex, the Life Star does N-spoke math, and `ON DELETE RESTRICT` keeps history safe.

**Changed:** `ProjectPromptInitial.md`, `ProjectPlan.md` (17 steps, phases A–E).

**Next:** Step 1.
