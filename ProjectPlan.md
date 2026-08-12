# Baby Steps — Project Plan

Source of truth for scope: [`ProjectPromptInitial.md`](./ProjectPromptInitial.md).

---

## 1. Decisions already made

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router) + React + TypeScript** | App Router is the current Next.js model. TypeScript catches "you spelled `activty`" at edit time instead of at 2am. |
| Styling | **Tailwind CSS v4** | Utility classes written inline (`p-8 rounded-lg`). v4 configures itself in CSS, no `tailwind.config.js`. |
| Components | **shadcn/ui** | Not a dependency you install — a CLI that *copies component source files into your repo*. Built on Radix primitives, so dialogs trap focus and radios work with arrow keys for free. You own every file and can restyle it. |
| Auth + database | **Supabase** | One service = Postgres + Google/GitHub OAuth + a JS client. Fewest moving parts. |
| Auth timing | **Early (Steps 2–4)** | Your call. Tradeoff accepted: the first sessions are config-heavy. |
| Drag & drop | **dnd-kit** | Gives a stylable drag preview, automatic "which square am I over", and keyboard support. |
| Charts | **Hand-written SVG** (no chart library) | The Life Star is a custom shape; a chart library would fight us. Also more educational. |

### Learning docs

Written to **`learning/`** in the repo, and committed alongside the code they explain — so
each step's diff and its explanation travel together. One file per step, named
`YYYY-MM-DD-NN-topic.html`, self-contained (inline CSS + JS), with a table of contents and
the three required sections: **Tools → Intuition → Code**.

---

## 2. The data model

Four tables. Every row carries a `user_id` so the database can enforce that you only ever
see your own data.

```
life_areas        id, user_id, name, slug, color_key, sort_order
                  → 6 rows seeded per user on first sign-in.
                    Rows, not constants — so renaming/adding/deleting is a v2 feature,
                    not a rewrite. color_key points at a named ramp, never a raw hex.

activities        id, user_id, life_area_id, name, mark, archived
                  → user-created. mark = one grapheme — a letter OR an emoji

day_activities    id, user_id, day (date), activity_id
                  → one row per sticker placed. UNIQUE(user_id, day, activity_id)

day_moods         id, user_id, day (date), mood
                  → UNIQUE(user_id, day)  ← this is what makes "one mood per day" true
```

> **Key idea — let the database hold the rules.** "A day may hold any number of activity
> stickers, but only one mood" is not enforced by careful UI code. It is a `UNIQUE`
> constraint on `(user_id, day)`. Dropping a mood on an occupied day becomes an *upsert*:
> "insert, or if that day already has one, overwrite it." The UI cannot get this wrong.

> **Key idea — "one character" is a lie.** `mark` is `TEXT`, and Postgres is UTF-8, so
> emoji already work. The trap is validating the length. `"👨‍👩‍👧".length` is **5** in
> JavaScript — it's three people glued together by zero-width joiners — and SQL `LENGTH()`
> agrees. Counting *graphemes* (what a human calls a character) needs
> `Intl.Segmenter`. We'll write that helper in Step 10 and use it on both sides.

**Palette.** Six life areas, each with a color *ramp* (a light/mid/dark set) so the same
area reads correctly on both themes: Spirituality `red` · Exercise `blue` · Work `orange` ·
Creativity & Play `yellow` · Romance & Adventure `green` · Friends & Family `purple`.
Moods are a separate five-color scale: Great `blue` · Good `green` · Okay `yellow` ·
Low `orange` · Rough `red`.

---

## 2b. Designed for, not built in v1

Things v1 will not implement, but must not make expensive later. Each has a cheap
constraint we honor now — the point is to avoid assumptions that are free today and a
rewrite tomorrow.

| Future capability | Costs nothing now if we… | Cost if we don't |
| --- | --- | --- |
| **Emoji marks** | Store `mark` as `TEXT` and validate by grapheme, not `.length`. | Already handled — emoji work in v1. |
| **SVG / icon marks** | Nothing. Add a `mark_kind` column ('text' \| 'icon') when wanted. | One small migration + a branch in `<StickerMark>`. Not worth pre-building. |
| **Rename a life area** | Never key anything off `name`. Display `name`; join on `id`. | Renaming "Work" would orphan every activity. |
| **Add a 7th+ life area** | Build the Life Star for **N** spokes (`360/N`), not six at 60°. Charts loop over the areas they're given. | Every chart hardcodes 6 and has to be rewritten. |
| **Custom area colors** | `color_key` names a ramp in a palette map; the map has ~12 ramps, not 6. | New areas have no color, or we start storing raw hex and lose theme-awareness. |
| **Delete a life area** | `activities.life_area_id` uses `ON DELETE RESTRICT`, plus an `archived` flag. | Deleting an area silently deletes months of history. |
| **Reorder areas** | `sort_order` column, already in the schema. | Ordering becomes alphabetical-by-accident. |

> **Key idea — the difference between flexible and over-built.** We are not writing a
> life-area editor. We're only refusing to *hardcode* things that are already data. Six
> areas live in a table with a sort order and a color key; the UI to edit that table is a
> later step, and adding it won't touch the schema or the charts.

---

## 2c. Visual direction

Reference screenshots: `~/Documents/design-screenshots/bighabits-screenshots/`
(`v0-1` login · `v02` calendar · `v0-3` life star · `v0-4` bars). We follow these closely
but not slavishly. The prototype is named "Big Habits"; ours is **Baby Steps**.

### Tokens

Warm cream ground, near-black warm ink, muted-but-distinct ROYGBV. Starting values, to be
tuned against the screenshots in Step 1:

| Token | Light | Role |
| --- | --- | --- |
| `--bg` | `#F7F4ED` | page ground, warm cream with a faint graph-paper grid |
| `--surface` | `#FDFCF8` | cards, calendar cells, chart panel |
| `--surface-sunken` | `#F1EEE6` | out-of-month day cells |
| `--ink` | `#1C1A17` | primary text |
| `--ink-muted` | `#8A8378` | eyebrows, labels, secondary prose |
| `--hairline` | `#E3DED2` | every border in the app is 1px of this |

| Life area | Hue | Value |
| --- | --- | --- |
| Spirituality | terracotta red | `#C4483C` |
| Exercise | steel blue | `#3178B5` |
| Work | burnt orange | `#D9762B` |
| Creativity & Play | mustard yellow | `#DDB63C` |
| Romance & Adventure | moss green | `#4C8B4A` |
| Friends & Family | amethyst | `#9457C0` |

Moods reuse the same five values: Great `blue` · Good `green` · Okay `yellow` ·
Low `orange` · Rough `red`.

> **Key idea — muted, not desaturated to mud.** These are recognizably red/blue/orange/
> yellow/green/purple, just pulled toward the earth end so they sit on cream without
> shouting. That matters functionally, not only aesthetically: the Life Star's whole job is
> letting you tell six areas apart at a glance.

### Component anatomy

- **Sticker chip** — a filled circle (~26px) in its life area's color, with the mark
  centered in white. Identical in the tray and on a day. Moods are the same circle with a
  drawn smile-curve instead of a letter, sitting inline at the end of the day's row.
- **Segmented control** — used twice, same component: the Calendar/Trends nav and the
  Life Star/Pie/Bars switcher. Active item is a soft filled stone pill; inactive is muted
  text on nothing.
- **Page header** — every page: a letterspaced uppercase eyebrow (`YOUR MONTH IN MARKS`,
  `THE SHAPE OF YOUR ATTENTION`), a large display-serif title, and controls pinned right.
- **Cards** — only the chart panel and calendar grid get a surface + hairline + ~16px
  radius. The Trends readout column sits directly on the page ground, no card.

### Typography

Cormorant (600) for display — wordmark, "July 2026", section headings. EB Garamond for
body, labels, and chart text. Two figure styles, deliberately: **oldstyle** in prose and
calendar dates (EB Garamond's default, the numerals with ascenders and descenders you can
see in "2026"), **tabular lining** in the Trends table so columns don't jitter.

### Deviations from the prototype

- Login shows **Continue with Google** and **Continue with GitHub**, not the prototype's
  email Log in / Sign up.
- Trends gains a **range selector** (month / year / all-time / custom) next to the chart
  switcher — required by the spec, absent from the mockup.
- Tray chips and table rows are **clickable to highlight** matching days (spec §Calendar);
  the mockup has no such state.
- The prototype's Life Star fills its polygon neutral grey with per-area colored vertex
  dots. Keeping that — it reads better than six-way color blending.

---

## 3. The steps

Each step is one sitting, one learning doc, one reviewable change.

---

### Phase A — Foundation

#### Step 1 · Scaffold and design system
**Goal:** A running Next.js app, under git, with our fonts and both themes defined.
**You'll see:** A near-empty page at `localhost:3000` on the warm cream ground with its faint graph-paper grid, set in Cormorant and EB Garamond, plus a shadcn Button shown before and after our tokens reach it, and a toggle flipping the whole thing to dark.
**New concepts:**
- *What a framework does* — Next.js gives routing, a build step, and a dev server with hot reload.
- *Design tokens* — we define colors once as CSS variables (`--color-surface`), and both themes are just two sets of values for the same names. Nothing else in the app ever hardcodes a color.
- *Serif type* — **Cormorant** for display, **EB Garamond** for body, loaded via `next/font` so they don't flash.
- *git from the start* — `git init` plus a `.gitignore` that excludes `node_modules/`, `.next/`, and `.env.local`. One commit per step, so you can read the project's history as a story.
- *shadcn/ui, and why it isn't a library* — `npx shadcn init` writes a `components.json` and a set of CSS variables. From then on, `npx shadcn add dialog` **copies a `dialog.tsx` into `components/ui/`**. There is no `<Dialog>` hiding in `node_modules` — it's your file, and you edit it like any other.
**Files:** `app/layout.tsx`, `app/globals.css`, `lib/theme.ts`, `components.json`, `.gitignore`
**Doc:** `01-scaffold-and-design-tokens`

> **Heads-up on shadcn's look — and the running before/after.** Its defaults are
> modern-SaaS: geometric sans, tight padding, small radii. That is the opposite of the
> prototype. The good news is that the retheme *is* the design-token work above — shadcn's
> components read the same CSS variables we're defining, so pointing them at Cormorant/EB
> Garamond and the cream palette is mostly a matter of setting the variables once.
>
> **Every doc that introduces a new shadcn component shows it twice: as the CLI delivers
> it, and after our tokens reach it.** Step 1 does this with a Button. It's the fastest way
> to internalize that these are your files, not a vendor's.

#### Step 2 · The shell
**Goal:** Top nav with in-state page switching.
**You'll see:** "Baby Steps" top-left in Cormorant, a centered segmented control where the active page sits in a soft stone pill and the other is muted text, and a moon icon + round avatar on the right. One hairline under it all. Clicking swaps the page body with no browser navigation.
**New concepts:**
- *React state* — `useState` holds which page is showing; changing it re-renders.
- *`preventDefault()`* — the links are real `<a>` tags for accessibility, but we cancel the browser's navigation and handle it ourselves.
- *Server vs Client Components* — the default is server-rendered; anything with state or clicks needs `"use client"`. This distinction will come up constantly.
**Files:** `app/page.tsx`, `components/TopNav.tsx`, `components/ThemeToggle.tsx`
**Doc:** `02-app-shell-and-client-components`

---

### Phase B — Identity and storage

#### Step 3 · Sign in with Google and GitHub
**Goal:** Real authentication.
**You'll see:** The login page from `v0-1` — centered on the gridded cream, eyebrow "A QUIET LEDGER OF DAYS", **Baby Steps** in large Cormorant, a two-line muted subtitle, then a filled near-black *Continue with Google* and an outlined *Continue with GitHub*. After authorizing, your avatar sits top-right with a sign-out menu, and refreshing keeps you logged in.
**New concepts:**
- *OAuth in one paragraph* — you never give Baby Steps your Google password. Google authenticates you and hands back a signed token saying "this is who they are."
- *Sessions and cookies* — the token lives in an httpOnly cookie the browser sends on every request.
- *Proxy* — one file that runs before every page and bounces logged-out visitors to sign-in. (Called *middleware* everywhere online; renamed to `proxy.ts` in Next 16.)
- *Secrets* — `.env.local`, and why it must be gitignored.
**Setup you'll do:** create a Supabase project; register OAuth apps at Google Cloud Console and GitHub Developer Settings; paste the keys.
**shadcn:** `button`, `avatar`, `dropdown-menu` — the user menu is our first real Radix component, and a chance to see what "accessible by default" buys (arrow-key navigation, Escape to close, focus returning to the trigger).
**Files:** `lib/supabase/{env,client,server}.ts`, `proxy.ts`, `app/login/page.tsx`, `app/auth/callback/route.ts`, `app/actions/auth.ts`, `lib/user.ts`, `components/UserMenu.tsx`
**Doc:** `03-oauth-sessions-and-proxy`

#### Step 4 · Schema, row-level security, and seeding
**Goal:** The four tables exist and are locked to their owner.
**You'll see:** Your six life areas rendered as colored chips on the Calendar page — read from the real database.
**New concepts:**
- *SQL migrations* — schema changes as ordered, committed `.sql` files, so the database is reproducible.
- *Row-Level Security* — a Postgres rule (`user_id = auth.uid()`) that filters every query. Even a buggy client query can't reach another user's rows. This is the single most important safety concept in the project.
- *Two kinds of "seed"* — the six life areas are **required app data** fixed by the spec, so a database trigger creates them the moment a new user appears. Sample stickers are **developer convenience** and stay out of the schema entirely.
**Files:** `supabase/migrations/*.sql`, `lib/queries/lifeAreas.ts`
**Doc:** `04-schema-rls-and-seeding`

> **Sample data — `npm run seed`.** Steps 5–7 render the calendar, but drag-and-drop (the
> first way to place a sticker through the UI) doesn't land until Step 8. So there's a
> stretch where the only way to get rows into `day_activities` is by hand. A small
> on-demand script fills a plausible July 2026; it never runs automatically, and it's
> idempotent, so re-running won't duplicate. Delete it once Step 8 works.
> Paired with `npm run seed:reset` to clear your placed stickers back to empty.

---

### Phase C — Calendar

#### Step 5 · The month grid
**Goal:** A correct, static calendar. No data yet.
**You'll see:** The eyebrow "YOUR MONTH IN MARKS" over a large "July 2026", ‹ › arrows pinned right, then a hairline grid: SUN–SAT letterspaced caps, tall cells with the date in oldstyle figures top-left, and adjacent-month days sunk to `--surface-sunken` with muted numerals.
**New concepts:**
- *Date math is a trap* — why we use a date library and store days as `YYYY-MM-DD` strings, never `Date` objects, to dodge timezone bugs. (A `Date` at midnight UTC is the *previous day* in California.)
- *Deriving, not storing* — the grid is computed from the current month, not kept in state. One source of truth.
- *CSS Grid* — `grid-cols-7` and why it beats flexbox here.
**Files:** `lib/dates.ts`, `components/calendar/{MonthGrid,DayCell,MonthHeader}.tsx`
**Doc:** `05-month-grid-and-date-handling`

#### Step 6 · Render placed stickers
**Goal:** Stickers stored in the database appear on their days.
**You'll see:** Seeded rows showing up as filled colored circles with a white mark, wrapping in a row under each date — the mood circle, with its drawn smile, last.
**New concepts:**
- *Fetching on the server* — the page queries Postgres before HTML is sent, so there's no loading spinner.
- *Shaping data for the UI* — turning a flat list of rows into a `Map<"2026-07-14", Sticker[]>` so each cell does one instant lookup instead of scanning the whole list.
**Files:** `lib/queries/stickers.ts`, `components/calendar/StickerMark.tsx`
**Doc:** `06-server-fetching-and-data-shaping`

#### Step 7 · The sticker tray
**Goal:** The right-hand palette.
**You'll see:** A right rail beside the grid — "Your stickers" in Cormorant with "Drag one onto a day" beneath it, a `+` button top-right (inert for now), then one letterspaced caps label per life area with its chips in a row, and MOOD's five faces last.
**New concepts:**
- *Presentational components* — the tray only displays; it owns no data.
- *Composition* — the same `<Sticker>` component renders in the tray and on a day, differing only by props.
**Files:** `components/tray/{StickerTray,TrayGroup}.tsx`
**Doc:** `07-the-tray-and-component-reuse`

#### Step 8 · Drag and drop
**Goal:** Drag a sticker from the tray onto a day and have it stick.
**You'll see:** The sticker lifts and follows your cursor; the square under it highlights; releasing drops it and it persists through a refresh. Dropping a mood on a day that has one replaces it.
**New concepts:**
- *dnd-kit's model* — `DndContext` (the arena), `useDraggable` (the sticker), `useDroppable` (the day), and the `onDragEnd` event carrying `{active, over}`.
- *`DragOverlay`* — the floating copy that follows the cursor, so the original stays put and nothing reflows.
- *Optimistic updates* — draw the sticker immediately, send the write in the background, roll back if it fails. This is why the app feels instant.
- *Upsert* — how "mood replaces mood" is one database call, not read-then-decide-then-write.
**Files:** `components/dnd/*`, `app/actions/stickers.ts`
**Doc:** `08-drag-and-drop-and-optimistic-updates`

#### Step 9 · The day modal
**Goal:** Click a day to edit it precisely.
**You'll see:** A centered panel with the date, checkable activities, and a five-way mood picker. Escape and click-outside close it.
**New concepts:**
- *Dialogs and focus traps* — why a modal must capture keyboard focus and return it on close, and how much of that Radix's Dialog handles for us. We'll open `components/ui/dialog.tsx` and read it, since it's our code.
- *Controlled inputs* — React state is the truth; the checkbox merely reflects it.
- *Two doors, one room* — the modal and drag-drop call the same server actions, so they can't drift apart.
**shadcn:** `dialog`, `checkbox`, `radio-group` (the five-way mood picker)
**Files:** `components/calendar/DayModal.tsx`
**Doc:** `09-modals-focus-and-controlled-inputs`

#### Step 10 · Create your own stickers
**Goal:** The `+` button works.
**You'll see:** A small form — name, one mark (type a letter *or* pick an emoji), and a required life area — and the new sticker appears in the tray immediately.
**New concepts:**
- *Server Actions* — an async function you write in one place and call from a form; Next.js handles the network round-trip. No REST endpoint to hand-write.
- *Counting characters correctly* — `graphemeCount()` built on `Intl.Segmenter`, so `"🏋️"` counts as 1 and the validator stops lying. Used by the form and the server action both.
- *Validation on both sides* — a friendly check in the browser, plus a real constraint in the database, because the browser can be bypassed.
**shadcn:** `input`, `label`, `select` (life area), `popover` (the emoji picker)
**Files:** `components/tray/NewStickerForm.tsx`, `app/actions/activities.ts`, `lib/graphemes.ts`
**Doc:** `10-server-actions-and-validation`

#### Step 11 · Highlight mode
**Goal:** Click a sticker or life area to see where it's been.
**You'll see:** Clicking "Meditation" tints every day you meditated in its red shade; everything else recedes. Click again to clear.
**New concepts:**
- *UI state vs stored state* — the highlight is not saved anywhere; it dies on refresh, and that's correct.
- *Lifting state up* — the tray and grid are siblings, so the selection lives in their shared parent.
- *Derived styling* — cells don't ask "am I highlighted?"; the parent passes the answer down.
**Files:** `components/calendar/CalendarPage.tsx`
**Doc:** `11-ui-state-vs-stored-state`

---

### Phase D — Trends

#### Step 12 · Aggregation and the range picker
**Goal:** Turn placed stickers into counts.
**You'll see:** A plain table on the Trends page: each life area, its mark count, its share. A range control for This Month / This Year / All Time / Custom.
**New concepts:**
- *Aggregation* — grouping rows and counting them; where to do it (database vs browser) and why we start in the browser.
- *`useMemo`* — recompute totals only when the stickers or range actually change, not on every render.
**shadcn:** `tabs` or `select` for the range control, `calendar` + `popover` for the custom date range
**Files:** `lib/analytics.ts`, `components/trends/RangePicker.tsx`
**Doc:** `12-aggregation-and-memoization`

#### Step 13 · The Life Star
**Goal:** The default visualization.
**You'll see:** The chart in a white rounded card. Six spokes, concentric hairline **hexagons** at 25/50/75/100% (polygonal rings, as in `v0-3`, not circles), a polygon with a dark hairline stroke and a soft neutral fill, a vertex dot in each area's own color, and an "Area · count" label at each spoke end.
**New concepts:**
- *Polar → Cartesian* — the one piece of trigonometry here: `x = cx + r·cos(θ)`, `y = cy + r·sin(θ)`. Worked through with real numbers.
- *SVG basics* — `viewBox` as a coordinate system that scales for free; `<polygon>`, `<circle>`, `<line>`.
- *Normalizing* — why radius is a share of the maximum, not an absolute count.
- *Writing it for N, not 6* — the spoke angle is `(2π / areas.length) · i`, never a hardcoded 60°. The component takes an array and draws however many it's handed. Costs one line today; means a seventh life area just works.
**Files:** `components/trends/LifeStar.tsx`
**Doc:** `13-svg-polar-coordinates-and-the-life-star`

#### Step 14 · Pie and Bars
**Goal:** The other two chart modes.
**You'll see:** The same segmented pill as the nav, switching Life Star / Pie / Bars. The donut uses each area's color with labels; the bars sort descending — area name in EB Garamond at left, a fully-rounded stone track with a fully-rounded colored fill, the count right in tabular figures.
**New concepts:**
- *SVG arc paths* — the `A` command, and why a donut is one stroked circle with `stroke-dasharray` rather than six wedge paths.
- *Same data, three lenses* — all three read one aggregation function, and all three loop over N areas. Adding a fourth chart would touch no data code.
- *Tabular figures* — the font feature that stops numbers from jittering as they change.
**shadcn:** `radio-group` for the chart switcher — genuinely controlled radios, keyboard-navigable, not styled divs pretending
**Files:** `components/trends/{Donut,Bars,ChartSwitcher}.tsx`
**Doc:** `14-arcs-donuts-and-shared-data`

#### Step 15 · The readout panel
**Goal:** The right-hand column.
**You'll see:** The right column sitting directly on the page ground — no card. A muted two-line sentence naming the biggest area ("Spirituality held the greatest share of your attention this month."), then an **Area / Marks / Share** table with hairline row rules and a colored dot before each name, then "Mood across the month" as a Cormorant heading over a horizontal strip of dot + name + count.
**New concepts:**
- *Charts need words* — a sentence that states the takeaway, generated from the data.
- *Accessible tables* — real `<th>` and `<caption>` so a screen reader can read the chart's contents.
**Files:** `components/trends/Readout.tsx`
**Doc:** `15-readouts-and-accessible-tables`

---

### Phase E — Finish

#### Step 16 · Motion and states
**Goal:** Make it feel finished.
**You'll see:** Stickers settle with a spring, the modal fades, months cross-fade, empty states say something kind, and skeletons appear instead of blank space.
**New concepts:** easing and why 150–250ms is the sweet spot; `prefers-reduced-motion`; loading and empty states as real design work.
**Doc:** `16-motion-and-empty-states`

#### Step 17 · Deploy
**Goal:** A URL you can open on your phone.
**You'll see:** Baby Steps live on Vercel.
**New concepts:** build vs dev; environment variables in production; adding the production callback URL to Google, GitHub, and Supabase — the step everyone forgets.
**Doc:** `17-deployment`

---

## 4. Working agreement

- **One step per session.** Code first, then its learning doc, then you review both.
- **I'll flag choices.** Anything with a real tradeoff comes to you as an explicit question rather than a silent decision.
- **Steps can be resequenced.** If Step 8 exposes something Step 5 got wrong, we fix it and say so in the doc.
- **Nothing is precious.** These are baby steps.

---

## 5. Settled

- **Learning docs live in-repo** at `learning/`, committed with the code they explain.
- **Type:** Cormorant for display, EB Garamond for body.
- **git:** initialized in Step 1, one commit per step.
- **Sample data:** an on-demand `npm run seed` script, never automatic. The six life areas
  are separate — those are real app data, seeded by trigger.
- **shadcn/ui** for dialogs, menus, radios, and form controls, introduced in Step 1 and
  then added component-by-component as each step needs one. Every doc that pulls in a new
  shadcn component explains what it is and shows the file it copied in.
- **Emoji marks work in v1.** SVG marks, and a UI for editing life areas, are deliberately
  out of scope but designed for — see §2b.
- **Visual target** is the `bighabits-screenshots` prototype — muted ROYGBV on warm cream,
  right-hand sticker rail, segmented pills. Tokens and deviations in §2c.

Ready to start Step 1 on your go.
