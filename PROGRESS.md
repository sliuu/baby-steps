# Progress

Newest first. One entry per step.

**Now:** Step 13 of 17 is done and confirmed in the browser, uncommitted. Step 14 (Pie and Bars) is next — four steps left after this one.

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

**State:** `npm test` 139/139 (up from 105), `tsc --noEmit`, `eslint .`, `npm run build` all clean. Verified `fill-ramp-{red,blue,orange,yellow,green,purple}`, `fill-none`, `stroke-hairline`, `stroke-ink`, `fill-ink`, `fill-ink-muted`, and `rounded-2xl` reached the compiled CSS with real values — ninth time. `fill-ink/10` shows the same two-rule pattern Step 11 recorded for `bg-ink/10`: an opaque `fill:var(--ink)` followed by `color-mix(in oklab, var(--ink) 10%, transparent)` inside an `@supports` guard, so reading only the first hit would say the polygon is solid. **Uncommitted.**

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
- **A live preview above the fields, drawn by `TrayRowFace` and `StickerMark`.** The same two components that draw the sticker in the tray, on a day, and in the modal — so it's a preview in the literal sense rather than an impression of one. `aria-hidden`, because every word in it was typed into a field two inches below. Before an area is picked the circle shows `ramp()`'s fallback, which is what the grid would show for an unrecognised colour: one fallback, one appearance.
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
