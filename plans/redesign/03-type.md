# 03 · Fonts and the type scale

- **Status:** TODO
- **Commit:** —
- **Severity:** foundation
- **Category:** design system
- **Estimated scope:** `app/layout.tsx`, new `app/fonts.ts`, `app/globals.css`

## Problem

`app/layout.tsx` loads Schibsted Grotesk (sans + heading) and Spectral italic
(`--font-note`, used at globals.css ~line 832). The new design uses a slab
display face and a light geometric text face, both set light (300).

The real faces are paid (Winden, Axiforma). The free stand-ins are Zilla Slab
and Outfit.

## Target

1. Read `node_modules/next/dist/docs/` on fonts first (`next/font` options may
   have changed in 16).
2. New `app/fonts.ts`:
   ```ts
   import { Zilla_Slab, Outfit } from "next/font/google";
   // Stand-ins for Winden (display) and Axiforma (text).
   // To switch to the licensed files: put the .woff2 files in app/fonts/,
   // replace these two calls with next/font/local, keep the same `variable`.
   export const display = Zilla_Slab({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-display-face", display: "swap" });
   export const text = Outfit({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-text-face", display: "swap" });
   ```
   `layout.tsx` puts both `.variable` classes on `<html>`, and drops Schibsted
   and Spectral.
3. globals.css bridge: `--font-display: var(--font-display-face), Georgia, serif;`
   `--font-sans: var(--font-text-face), system-ui, sans-serif;` and point
   `--font-heading` at the display stack. Base `body` gets `font-weight: 300`.
   If decision 3 holds (retire Spectral), point `--font-note` at the display
   stack too; plan 15 deletes it.
4. Type scale. Replace the current text role tokens with these (size / line
   height). Keep the existing role names where they map, so components that
   already use `text-page-title` etc. keep working:

   | Token | Size / line | Face, weight | Use |
   | --- | --- | --- | --- |
   | `--text-display-xl` | 64 / 1.05 | display 300 | sign-in headline |
   | `--text-display` | 56 / 1.05 | display 300 | today's date |
   | `--text-display-sm` | 46 / 1.1 | display 300 | page titles |
   | `--text-heading` | 36 / 1.15 | display 300 | onboarding questions |
   | `--text-subhead` | 26 / 1.2 | display 400 | section titles, logo |
   | `--text-body-lg` | 20 / 1.4 | text 300 | intro copy |
   | `--text-ui` | 16 / 1.4 | text 300/400 | body, buttons, nav |
   | `--text-label` | 14 / 1.35 | text 400 | labels, chip text |
   | `--text-caption` | 12 / 1.3 | text 400 | footer, calendar dates |

   Letter-spacing: display sizes `-0.01em`; caption `0.02em`. No uppercase
   tracking styles anywhere (all copy is lowercase).
5. Add a small helper `lib/format.ts` (or extend the existing date helper) with
   `formatDateNumeric(d) → "10/15/2026"` using date-fns `format(d, "M/d/yyyy")`.
   Do not change any date math; display only.

> **Amended (as built):** old names map onto the scale: `display-lg`→display-xl,
> `page-title`→display-sm, `section-title`→heading, `panel-title`→subhead,
> `dialog-title`→body-lg size; Tailwind `xs`/`sm`/`base`→caption/label/ui
> (`lg`+ unchanged until components move). `eyebrow` lost its caps and tracking
> (label size, ink-muted); `daylabel` is caption. `note` is the display face at
> 300, upright. Existing copy was not lowercased; that happens as each surface
> is restyled. Body text is Outfit 400, not 300 (Stephanie asked to try it).

## Copy convention (applies from here on)

All UI copy is lowercase. Exceptions: proper nouns typed by the user (sticker
names are shown as entered), and the "Sign in with Google" button (Google's
brand rules). Do not add `text-transform: lowercase` in CSS; write the strings
lowercase so screen readers and copy-paste match.

## Verify

- Build, lint, test.
- Network tab: only two font families load; no Schibsted/Spectral requests.
- Headline on login and date on today render in the slab face at 300.
