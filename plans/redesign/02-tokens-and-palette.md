# 02 · New tokens: frame, paper, ink, category inks, moods

- **Status:** DONE
- **Commit:** ada3e99
- **Severity:** foundation
- **Category:** design system
- **Estimated scope:** `app/globals.css`, `lib/palette.ts`, `lib/rampValues.ts`, `lib/moods.ts` (no migration; see below)

## Problem

`app/globals.css` already has a good structure: raw values in `:root` /
`.dark`, and an `@theme inline` block (line ~27) that turns them into Tailwind
utilities. The values are the old newsprint palette:

- Surfaces `--bg #ebeae4`, `--surface #f3f2ed`, `--ink #141414`,
  `--today-mark #d4271c` (line ~510).
- Six hue ramps named after generic colours (`--ramp-red` … `--ramp-purple`,
  line ~515), each with `-soft` and `-tint` (a 45% `color-mix` into surface,
  `--sticker-fill`, line ~561). Stickers use the tint.
- `lib/palette.ts` maps a `color_key` (`red`, `blue`, …) to class strings.
  Exercise is `blue` in the DB but will be bottle green, so the key names stop
  meaning anything.
- `lib/moods.ts` colours moods by borrowing ramp tints, and orders them
  great → rough.

**Do not add a second token system** (the starter kit's `tokens.css` /
`--bs-*` files are superseded by this plan). Change the values inside the
existing one.

## Target

### Raw tokens (`:root` in globals.css)

Group them with comments in this order: primitives, semantic, categories, moods,
size, motion. Keep the existing motion tokens as they are.

```css
/* ── primitives ─────────────────────── */
--blush:    #F1D0CA;
--espresso: #4E4036;
--ivory:    #FFFEF5;
--cream:    #FBF8EF;
--bottle:   #23402F;
--oxblood:  #7A1F1F;

/* ── semantic: use these, not primitives ── */
--frame:       var(--blush);
--on-frame:    var(--bottle);
--paper:       var(--ivory);
--raised:      var(--cream);
--ink:         var(--bottle);
--ink-muted:   color-mix(in srgb, var(--ink) 75%, transparent);
--ink-subtle:  color-mix(in srgb, var(--ink) 45%, transparent);
--accent-ink:  var(--oxblood);
--rule-strong: var(--ink);
--rule:        color-mix(in srgb, var(--ink) 25%, transparent);
--rule-grid:   color-mix(in srgb, var(--ink) 14%, transparent);
--rule-input:  color-mix(in srgb, var(--ink) 45%, transparent);
--focus-ring:  2px solid var(--accent-ink);

/* ── categories: ink / readable text / icon on sticker ── */
--cat-oxblood: #7A1F1F; --cat-oxblood-text: #7A1F1F; --cat-oxblood-on: var(--paper);
--cat-bottle:  #23402F; --cat-bottle-text:  #23402F; --cat-bottle-on:  var(--paper);
--cat-mustard: #C9A23A; --cat-mustard-text: #9C7A1E; --cat-mustard-on: var(--ink);
--cat-rose:    #D98C7A; --cat-rose-text:    #B0614F; --cat-rose-on:    var(--ink);
--cat-sage:    #8FA98A; --cat-sage-text:    #5E7A59; --cat-sage-on:    var(--ink);
--cat-plum:    #765B8C; --cat-plum-text:    #765B8C; --cat-plum-on:    var(--paper);

/* ── moods, sad → happy ── */
--mood-rough: #6F95B8;
--mood-low:   #A8C2D6;
--mood-okay:  #D3D6C5;
--mood-good:  #F5DE8E;
--mood-great: #EFC548;

/* ── shadows ── */
--shadow-sheet: 0 1px 2px color-mix(in srgb, var(--ink) 10%, transparent);
--shadow-menu:  0 6px 24px color-mix(in srgb, var(--ink) 12%, transparent);
```

> **Amended:** the raw tokens are `--sheet-shadow` / `--menu-shadow`, so the
> bridge's `--shadow-sheet: var(--sheet-shadow)` isn't a cycle. Old tokens
> (`--bg`, `--surface`, `--ramp-*`, `--cat-*-soft`/`-tint`, …) stay as aliases
> onto the new ones until their callers move (plans 05–15). `--secondary` is a
> 7% ink wash on paper.

And the frame trial:

```css
[data-frame="espresso"] { --frame: var(--espresso); --on-frame: var(--ivory); }
```

### Bridge (`@theme inline`)

Add `--color-frame`, `--color-on-frame`, `--color-paper`, `--color-raised`,
`--color-ink`, `--color-ink-muted`, `--color-ink-subtle`, `--color-accent-ink`,
`--color-rule-strong`, `--color-rule`, `--color-rule-grid`, `--color-rule-input`,
`--color-cat-<key>`, `--color-cat-<key>-text`, `--color-cat-<key>-on` for the six
keys, `--color-mood-<id>` for the five moods, `--shadow-sheet`, `--shadow-menu`.

Check for a cycle: a bridge entry must never point at a raw token of the
same name (`--color-ink: var(--ink)` is fine because the names differ).

Repoint the existing shadcn aliases so shadcn primitives pick up the new look
without being edited: `--background → --paper`, `--foreground → --ink`,
`--primary → --ink`, `--primary-foreground → --paper`, `--ring → --accent-ink`,
`--border → --rule`, `--popover → --raised`, `--muted-foreground → --ink-muted`.
`--today-mark` becomes `var(--accent-ink)` for now; plan 15 removes the alias.

### Category colour keys

> **Amended:** no migration. Production shares the database, so `color_key`
> keeps `red`/`blue`/…; `fromDbColorKey()` in `lib/palette.ts` maps them on
> read (`lib/queries/activities.ts`). Writes don't touch `color_key`.

1. ~~Migration `<timestamp>_category_color_keys.sql`:~~
   ```sql
   update public.categories set color_key = case color_key
     when 'red' then 'oxblood'  when 'blue' then 'bottle'
     when 'orange' then 'mustard' when 'yellow' then 'rose'
     when 'green' then 'sage'   when 'purple' then 'plum'
     else color_key end;
   ```
   Plus replace `seed_categories()` so new users get the new keys. If
   `color_key` has a check constraint, swap it for the new six names.
   Then `npm run types:db`.
2. `lib/palette.ts`: rename the type to `CategoryColor =
   "oxblood" | "bottle" | "mustard" | "rose" | "sage" | "plum"`. Rewrite the
   map so each entry has `ink` (`bg-cat-<key>`), `text` (`text-cat-<key>-text`),
   `on` (`text-cat-<key>-on`), `fill` (`fill-cat-<key>`), `stroke`
   (`stroke-cat-<key>`), `dot` (`bg-cat-<key>`). Keep the file's long comment
   about why the map is written out (Tailwind can't see template strings).
   Rename `ramp()` to `categoryColor()`; keep the fallback for unknown keys.
   Remove `soft`, `lit`, `tint`, `wash()` only after their callers are moved
   (most move in plans 05–13; keep thin aliases until plan 15 if needed).
3. `lib/rampValues.ts` → `lib/categoryValues.ts` holding the raw hexes, for SVG
   places that need a literal (chart exports). Add a test that each value
   matches globals.css, the same way the existing test does if there is one;
   otherwise add `lib/categoryValues.test.ts` that parses globals.css.
4. Update `lib/demo.ts` colour keys.

### Moods

`lib/moods.ts`:
- `MOODS` becomes sad → happy: `["rough", "low", "okay", "good", "great"]`.
  The DB check constraint is unchanged; this is display order only.
- `MOOD_COLOR` points at `--mood-*` (class `bg-mood-<id>`), not ramps.
- Keep `MOOD_MOUTH` and `isMood`. Update any test that asserted the old order.
- Charts that rely on index order (`MoodBars`, `MoodLine`) must be checked so
  "great" is still the top/right end.

## Verify

- `npm test` (palette, moods, demo tests), `npm run lint`, `npm run build`.
- App renders with no unstyled holes: ivory backgrounds, green text, stickers in
  the new six colours (shape is still old until plan 05). Exercise is green.
- Toggle `document.documentElement.dataset.frame = "espresso"` in devtools; only
  the frame colour and footer text change.
- `grep -rn "#[0-9a-fA-F]\{6\}" components app lib --include=*.tsx` shows no new
  hexes.
