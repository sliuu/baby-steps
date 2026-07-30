# Progress

Newest first. One entry per step.

**Now:** Step 1 of 17 done. Step 2 (the shell) is next.

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

**State:** builds clean, both routes static, both themes verified in the compiled CSS. Commit `f5a7ff6`; grid removal still uncommitted.

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
