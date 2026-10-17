# Redesign: the stationery direction

The app moves from "newsprint" to **stationery**: an ivory sheet of paper sitting
in a coloured frame, printed in bottle-green ink with oxblood as the one accent,
and stickers that are solid ink circles with a die-cut paper edge. It also gains
three new things: a **balance flower** on Today, an **onboarding** flow built
around the Artist's Way life pie, and a **design system page** in the app.

The design was worked out on a canvas (boards "Design system · stationery",
"A3 · today", "Calendar · grid lines + account menu", "Sign in · stationery",
"Onboarding 1–3"). Every value needed is written into these plans, so the canvas
is a reference, not a dependency.

## Before you start (every plan)

1. Read `CLAUDE.md`, `AGENTS.md` and `PROGRESS.md`. Next.js here is 16.x and
   differs from training data; read the relevant guide in
   `node_modules/next/dist/docs/` before touching routing, fonts or proxy code.
2. One plan = one commit (or one PR). Do not start the next plan until the
   current one passes its checks.
3. Every plan ends with: `npm test`, `npm run lint`, `npm run build`, then a look
   at every screen it touched at **1440px and 390px**. Write one PROGRESS.md
   entry per plan in the existing style (newest first, what changed and why).
4. **No raw colour, font or size values outside `app/globals.css`.** Components
   use the Tailwind utilities the `@theme inline` bridge generates. If a value
   is missing, add a token; do not inline a hex.
5. After any migration, run `npm run types:db` and commit the regenerated
   `lib/database.types.ts` in the same commit.

## Decisions already made (do not relitigate)

- **"Category", not "life area".** Plan 01 renames it in types, variables,
  CSS and copy. **The database keeps `life_areas` / `life_area_id` /
  `seed_life_areas`** (production shares the database; see plan 01). Translate
  any SQL in later plans accordingly. Likewise `color_key` keeps the old
  values (`red`, `blue`, …); `fromDbColorKey()` maps them (plan 02).
- **Every activity is the user's own.** There is no `is_custom` flag and no
  shared catalogue table. "Suggestions" are a static list in code
  (`lib/suggestions.ts`) that onboarding and the new-sticker form offer;
  choosing one inserts a normal `activities` row.
- **Palette** (light theme):

  | Role | Token | Hex |
  | --- | --- | --- |
  | Frame (outside the sheet) | `--frame` | `#F1D0CA` blush |
  | Paper (the sheet, sticker edge) | `--paper` | `#FFFEF5` ivory |
  | Ink (text, rules, outlined buttons) | `--ink` | `#23402F` bottle green |
  | Accent (today, selected, highlights) | `--accent-ink` | `#7A1F1F` oxblood |
  | Raised surface (menus) | `--raised` | `#FBF8EF` |
  | Text on frame (footer) | `--on-frame` | `#23402F` |

  Rules are ink at fixed strengths: strong 100%, section 25%, grid 14%,
  dashed input 45%. Muted text is ink at 75%, subtle 45%.

  An alternate dark frame is on the table: `--frame: #4E4036` (espresso) with
  `--on-frame: #FFFEF5`. Build it as `[data-frame="espresso"]` so it can be
  compared with one attribute; blush stays the default.

- **Category inks** (sticker fill, petal, pie slice, dot). `text` is the
  readable version for small type on paper; `on` is the icon colour on the
  sticker.

  | Category (slug) | New colour key | ink | text | on |
  | --- | --- | --- | --- | --- |
  | spirituality | `oxblood` | `#7A1F1F` | `#7A1F1F` | paper |
  | exercise | `bottle` | `#23402F` | `#23402F` | paper |
  | work | `mustard` | `#C9A23A` | `#9C7A1E` | ink |
  | creativity | `rose` | `#D98C7A` | `#B0614F` | ink |
  | romance | `sage` | `#8FA98A` | `#5E7A59` | ink |
  | friends | `plum` | `#765B8C` | `#765B8C` | paper |

- **Mood scale**, always shown sad → happy, left to right:
  rough `#6F95B8`, low `#A8C2D6`, okay `#D3D6C5`, good `#F5DE8E`,
  great `#EFC548`. Moods get their own tokens; they no longer borrow sticker
  ramps.
- **Type.** Display: Winden (stand-in **Zilla Slab** 300/400). Text: Axiforma
  (stand-in **Outfit** 300/400). Load the stand-ins with `next/font/google`
  behind `--font-display` / `--font-text` variables so the licensed files can be
  swapped in with `next/font/local` later without touching components.
  Everything lowercase except proper nouns and the Google button. Dates numeric
  (`10/15/2026`).
- **Layout.** Frame with 44px padding → one ivory sheet, square corners, 1px soft
  shadow → header (logo left; nav + account menu right; 1px ink rule under it)
  → content. Footer (`© 2026 baby steps · privacy · terms · contact`) sits in
  the frame, not on the sheet. Left-aligned text everywhere.
- **Spacing steps:** 8 · 14 · 18 · 22 · 30 · 44 · 64 · 96 px.
- **Balance level.** Each category has a level 0–3 = the number of the last
  three calendar weeks in which it got at least one sticker. The flower (Today)
  and the life pie (onboarding) both draw this same number.
- **Drag and drop stays.** Tapping a sticker in the tray also adds it to the
  selected day; dragging still works exactly as now.

## Decisions to confirm with Stephanie (defaults in bold)

1. Category display names: **keep the current names** ("Creativity & Play",
   "Romance & Adventure", "Friends & Family") or shorten to play / adventure /
   friends as in the mocks.
2. Dark theme: **hide the toggle and ship light only** until a dark stationery
   theme is designed. The `.dark` block stays in the file, untouched.
3. Spectral italic `note` face: **retire it**; notes use the display face at 300.
4. Trends: **keep the Life Star** on Trends (restyled), add the flower on Today
   only.

## Plans

| # | Title | Depends on | Status |
| --- | --- | --- | --- |
| [01](01-rename-life-areas-to-categories.md) | Rename life areas to categories | none | DONE (d386604) |
| [02](02-tokens-and-palette.md) | New tokens: frame, paper, ink, category inks, moods | 01 | DONE (ada3e99) |
| [03](03-type.md) | Fonts and the type scale | 02 | DONE (9ed8439) |
| [04](04-page-frame.md) | Frame, sheet, header, account menu, footer | 02, 03 | DONE (6ac928c) |
| [05](05-sticker.md) | The sticker: solid ink, paper edge, icon colour | 02 | DONE (db3f287) |
| [06](06-mood.md) | Mood picker and mood dot | 02 | DONE (3afbdb1) |
| [07](07-balance-flower.md) | Balance level + the flower | 05 | DONE (e3a68fa) |
| [08](08-today.md) | Today view | 04, 05, 06, 07 | DONE (f578672) |
| [09](09-calendar.md) | Month and week views, day sheet | 04, 05, 06 | DONE (e159be6) |
| [10](10-tray-and-suggestions.md) | Sticker tray, tap-to-add, suggestions | 05 | DONE (9b5b55b) |
| [11](11-sign-in.md) | Sign-in page | 04, 05 | DONE (45edfc5) |
| [12](12-onboarding.md) | Onboarding: life pie, activities, stay in touch | 04–07, 10 | DONE (4da4b7f) |
| [13](13-trends.md) | Trends restyle | 02–06 | DONE (9795ada) |
| [14](14-design-system-page.md) | `/dev/system` living reference | 02–07 | DONE (9dc0c04) |
| [15](15-cleanup.md) | Remove what the redesign replaced | all | DONE (4753ac6) |

## Order

01 → 02 → 03 → 04 → 05 → 06 → 07 → then 08–11 in any order → 12 → 13 → 14 → 15.

01 is purely mechanical and must land first so every later plan uses the new
names. 02 is the foundation; after it the app will look half-converted, which is
expected. 14 can be started any time after 07 and grown as components land; it
is the best place to check a component before it reaches a real screen.

## Out of scope

- Texting / SMS logging and reminders (Twilio). Onboarding only stores the
  phone number and an opt-in flag; sending is a separate project.
- A dark stationery theme.
- Buying and installing the Winden / Axiforma licences.
