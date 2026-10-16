# 15 · Remove what the redesign replaced

- **Status:** TODO
- **Commit:** —
- **Severity:** low
- **Category:** cleanup
- **Estimated scope:** whatever is now unused

## Target

Delete, after confirming with grep that nothing imports or references them:

- globals.css: `--bg`, `--surface`, `--hairline`, `--today-mark`, all
  `--ramp-*` / `--ramp-*-soft` / `--ramp-*-tint`, `--sticker-fill`,
  `--sticker-shadow`, `--area-*` aliases, `--font-note` (if decision 3 held), the
  old text role tokens that were not reused, and their bridge entries.
- `lib/palette.ts`: `soft`, `lit`, `tint`, `softFill`, `softStroke`, `wash()`,
  and any `ramp()` alias kept for migration.
- `lib/rampValues.ts` if fully replaced by `lib/categoryValues.ts`.
- `components/calendar/MoodMark.tsx` if callers use `MoodDot`.
- `components/auth/FloatingStickers.tsx`, `PointerNudge.tsx` if unused.
- `StickerFace` in `lib/stickers.ts` if unused.
- The `.dark` block stays (decision 2) but add a comment at its top: "old
  newsprint dark theme; not applied; replace when a dark stationery theme is
  designed".
- `plans/README.md`: add a line pointing to `plans/redesign/` and mark these
  plans DONE with commit hashes.

Then a token audit:

```sh
# raw colours outside globals.css
grep -rnE "#[0-9a-fA-F]{3,8}\b" app components lib --include=*.tsx --include=*.ts | grep -v globals.css
# inline style colours
grep -rn "style={{" components app | grep -iE "color|background|border"
# arbitrary Tailwind values that should be tokens
grep -rnE "\[(#|[0-9]+px)" components app --include=*.tsx
```

Each hit is either moved to a token or left with a one-line comment saying why
it must be literal (for example, SVG exports).

## Verify

- Build, lint, test. Every screen at 1440 and 390 once more, including
  `/demo`, `/login`, `/onboarding`, `/dev/system`.
