# Progress

Newest first. One entry per step.

**Now:** Step 8 of 17 done. Step 9 (the day modal) is next.

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
