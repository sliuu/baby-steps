# Progress

Newest first. One entry per step.

**Now:** Step 4 of 17 done. Step 5 (month grid) is next.

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
