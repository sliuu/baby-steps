# 11 · Sign-in page

- **Status:** DONE
- **Commit:** 45edfc5
- **Severity:** medium
- **Category:** screen
- **Estimated scope:** `app/login/page.tsx`, `components/auth/*`

## Problem

`app/login/page.tsx` (136 lines) with `FloatingStickers`, `PointerNudge` and
`SignInButtons` reflects the old look and copy.

## Target

Uses `PageFrame` (plan 04) with a reduced header: logo left, outline
"Sign in with Google" `sm` button right (no nav, no avatar).

Body, left-aligned, max width ~720px, 96px from the header:

1. "welcome to baby steps!" — `text-display-xl`, `accent-ink`.
2. "your guilt-free, come as you please, just for kicks," — `text-heading`.
3. The struck list, each on its own line, `text-heading ink-muted`:
   "habit tracker", "activity logger", "life manager". A 2px `accent-ink`
   strike line draws across each in turn (left to right, ~400ms each, 250ms
   apart) after the page settles.
4. "place to hang out" — `text-heading`, fades in after the last strike.
5. "what have you been up to?" — `text-body-lg`, 44px below.
6. Outline "Sign in with Google" `md` button (the existing `SignInButtons`
   logic, restyled), and beside it a `text` link "demo" (`text-label`,
   `ink-muted`) to `/demo`.

All copy is Stephanie's; use exactly these strings.

Motion: CSS only, using the existing `--dur-*` tokens. With
`prefers-reduced-motion`, show the final state (all three struck, last line
visible) with no animation. No replay button.

`FloatingStickers` / `PointerNudge`: remove from this page. If nothing else
imports them, delete in plan 15.

> **Amended (as built):**
> - GitHub sign-in stays, as a quiet "sign in with github" text button under the Google row, so existing GitHub accounts can still get in.
> - Headline is `text-display` on phones, `text-display-xl` from `sm`.
> - Strike timing lives in `globals.css` (`--dur-strike`, `--strike-gap`, `--strike-wait`); the delay is inside `--animate-strike` because the `animation` shorthand would reset a separate delay.
> - `FloatingStickers` / `PointerNudge` are still used by `app/not-found.tsx`; plan 15 decides.

## Verify

- 1440 and 390; the strike animation runs once; reduced motion shows the end
  state.
- The Google button still completes OAuth (`app/auth/callback`).
- "demo" opens `/demo`.
