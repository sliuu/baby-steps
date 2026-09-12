# Baby Steps

A habit tracker for the long view.

Most habit apps are built around the streak — the unbroken chain you're one bad
day away from losing. Baby Steps isn't. You put a sticker on a day when you did
something, and that's it. There's no streak to break, no scolding, no empty day
demanding an explanation. Habits are built slowly; a missed day is not an event.

The satisfaction is meant to come from looking back. A month of stickers, a year
of squares per habit, a star that shows where your life actually went — the
picture you couldn't see while you were living it. Simple to use on any given
day, quietly rewarding over months.

Built with Next.js 16 (App Router), React 19 and TypeScript, Tailwind v4 with
shadcn/ui, Supabase for Postgres and OAuth, dnd-kit for drag-and-drop, and
hand-written SVG for the charts.

## Three sections

- **Week** — seven tall columns, stickers as named bars, a note field per day.
- **Month** — the calendar grid, stickers dragged in from a tray, one mood per day.
- **Trends** — three tabs. *Areas* is the Life Star and a table of where your
  marks went; *Habits* pairs a ranking of your most-done with a grid of every
  habit's last eight weeks, a square per day; *Moods* is how the days felt — a
  line over time, then a count of each.

All three are visible without an account at **`/demo`**, over a year of stickers
generated from today — real boards, real drag-and-drop, nothing written down.
The library there is the one `npm run seed` installs.

## Running it

Needs Node 22+ and a Supabase project.

```bash
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Set up Google/GitHub OAuth first — **[`OAuthSetup.md`](./OAuthSetup.md)**, about
25 minutes of console work, no code. Then link the project, push the migrations
in `supabase/migrations/`, and:

```bash
npm run seed   # life areas + a starter habit library
npm run dev
```

## Scripts

| | |
| --- | --- |
| `npm run dev` / `build` / `start` | the usual |
| `npm test` | `node --test` over `lib/*.test.ts` |
| `npm run lint` | eslint |
| `npm run check:dates` | guards against timezone-shifted dates |
| `npm run seed` / `seed:reset` | starter data / wipe |
| `npm run types:db` | regenerate `lib/database.types.ts` |

`test`, `lint`, `check:dates` and `build` are the four gates; all four are
expected green before a step is committed.

## Where things live

```
app/actions/     server actions (stickers, activities, auth)
lib/queries/     Supabase reads
lib/             pure modules — analytics, charts, heatmap, lifestar, demo, dates…
components/      calendar/ tray/ trends/ dnd/ demo/ ui/
supabase/        schema + RLS migrations
learning/        one explainer per step
```

Everything in `lib/` outside `queries/` and `supabase/` is deliberately free of
value imports, so it runs directly under `node --test` with no build step.

## The other docs

- **[`PROGRESS.md`](./PROGRESS.md)** — newest first, one entry per step: what
  changed about the interface, why, and what's still open. Read this first.
- **[`AGENTS.md`](./AGENTS.md)** — this is not the Next.js you know. Check
  `node_modules/next/dist/docs/` before writing framework code.
- **[`ProjectPlan.md`](./ProjectPlan.md)** — the decisions, made once, with reasons.
