/**
 * The page gutter, in one place.
 *
 * The nav and the page body have to agree on it — the wordmark sits directly
 * above the calendar's left edge, and a mismatch between the two is the kind of
 * misalignment you see immediately and hunt for a while. It was duplicated in
 * two files until the calendar grew a right rail and needed a wider page.
 *
 * Two numbers, and they bind at different sizes — which is why changing the
 * margin means changing both. On a wide screen `max-w-*` is what stops the
 * content, and the gutter is whatever's left over; on a laptop the max-width
 * never comes into play and `px-*` is the entire margin. Moving only one of
 * them widens the page in half the windows it's viewed in.
 *
 * **The cap is 96rem — 1536px — and it is written as the breakpoint token
 * rather than as a number.** It was `7xl` and `px-8`, then `6xl` (72rem) and
 * `px-10`, both chosen to hold the calendar at a particular width once the
 * rail took its share of the row. Then it was briefly nothing at all, which
 * was one step too far: a month on a 34" monitor is seven very wide columns of
 * mostly empty cell.
 *
 * Why the body should stretch at all, and it is the week rather than the
 * month: seven columns that each hold a stack of *named* bars and a note
 * field, where every extra pixel is a habit name that doesn't truncate. The
 * month gets bigger squares out of the same deal, which is no worse than
 * bigger margins. The old argument for a tight cap — a month is a fixed seven
 * columns, so it doesn't *need* width, it just fills it — is true of the month
 * and wrong about the week.
 *
 * Why this number. Tailwind's own max-width scale stops at 7xl, which is 80rem
 * or 1280px, so anything wider has to come from somewhere else, and the
 * somewhere else worth using is the breakpoint scale — `--breakpoint-2xl`,
 * 96rem. That keeps the page's cap and the point at which `2xl:` utilities
 * start firing as one number rather than two that are nearly the same: a cap
 * at 1500px would mean every `2xl:` rule in the app engaged 36px after the
 * layout had already stopped growing, which is a confusing half-inch to
 * debug. 1536 is a conventional figure in its own right — 12 × 128, 16 × 96.
 *
 * The screen-prefixed spelling of this still resolves in 4.3.3, but it is
 * deprecated in v4 in favour of naming the breakpoint variable directly, so
 * this uses the variable.
 *
 * The other candidate was 1440px (90rem), the more common number in *design*
 * files — the Figma desktop frame, a MacBook Pro's logical width — and the one
 * to reach for if 1536 turns out to feel too wide. Tailwind ships no token for
 * it, so it would arrive as an arbitrary bracketed value: a magic number where
 * this is a name.
 *
 * One footnote for whoever edits this comment. Tailwind's scanner reads *this
 * file*, comments included, and it cannot tell prose from markup — so writing
 * a real utility name in here verbatim is enough to emit a live CSS rule for
 * it. An earlier draft of this paragraph shipped two, which is why the two
 * alternatives above are now described rather than spelled.
 *
 * `mx-auto` is load-bearing again now that there is something to centre
 * within.
 *
 * **The gutter is two numbers now, and the smaller one is the phone's.** 40px
 * either side of a 375px screen leaves 295px of page, which is a fifth of the
 * width spent on margin — enough that the day strip's seven columns stop
 * fitting and a sticker name starts truncating at four words. 20px is the
 * narrow value; the wide one is unchanged and takes over at the same
 * breakpoint the top nav swaps its pill for the bottom bar, so the page's
 * margin and the page's navigation change shape together rather than 200px
 * apart.
 */
export const PAGE_WIDTH =
  "mx-auto w-full max-w-(--breakpoint-2xl) px-5 lg:px-10";

/**
 * The tray's own gutter, and the same problem one level down.
 *
 * A tray row is a hover-and-drag band, so it needs padding inside its edges —
 * without it the highlight starts exactly where the circle does and looks
 * clamped to it. But padding a row and nothing else pushes every sticker to the
 * right of the label naming it, and cancelling that with a negative margin puts
 * the row outside the rail, which is a horizontal scrollbar (`overflow-y: auto`
 * promotes `overflow-x` to `auto` alongside it). So the padding can't be the
 * row's alone.
 *
 * Everything in the rail carries it instead: the header, each group label, each
 * row. They all start at the same x, the highlight extends past them on both
 * sides, and nothing reaches the rail's edge. Three files have to agree, which
 * is exactly why it's a constant.
 */
export const TRAY_INSET = "px-2";

/**
 * The line that says a new thing starts here.
 *
 * Two pixels of `--rule`, along the top and nowhere else. It is separate from
 * `PANEL` because two kinds of thing wear it and only one of them wants the
 * padding: a panel is a heading with air under the rule, while the two grids
 * start their cells immediately against it and the two empty states set their
 * own generous padding around a centred sentence. Sharing the width and the
 * colour is the point — those are the numbers that would drift, and five files
 * spelling them out is five chances to drift.
 *
 * It composes with `border-dashed`, which is how both empty states are drawn:
 * different properties, so no Tailwind conflict and no order to get wrong.
 */
export const RULE = "border-t-2 border-rule";

/**
 * A panel, in the week strip's language: one rule above it and nothing else.
 *
 * The week gave up being a card first — the month is forty-two cells that have
 * to hold together as one object, a week is seven columns that are each a page
 * of their own, and an outline around those read as a card with seven panels.
 * What replaced it was a single thick rule above and hairlines between, and the
 * page got quieter in a way that turned out to be worth spreading: Trends was
 * five rounded white boxes on an off-white page, which is five objects announcing
 * themselves where there are only three answers.
 *
 * So a panel here is a heading with a rule over it. No fill, because the page's
 * own off-white is a perfectly good ground and a white box on it is a claim that
 * something separate is going on inside. No radius, because there is no box to
 * round. No side or bottom edges, so a panel ends where its content ends rather
 * than at a line drawn under it, and two panels side by side in a grid read as
 * one rule broken by the gap between them — which is how the week reads across
 * its seven columns.
 *
 * The padding is the rule's air and nothing else. Horizontal padding would
 * indent every panel's text from the page's own gutter, which is the alignment
 * `PAGE_WIDTH` exists to keep.
 *
 * Thin lines inside a panel are still right: the habit table's rows are divided
 * by hairlines, and that is the same grammar one level down — thick says "a new
 * thing starts here", thin says "and it has parts".
 */
export const PANEL = `${RULE} pt-4`;

/**
 * The corner every control in the app turns.
 *
 * **These were all `rounded-full`, and the page had four radii on it at once**
 * — full-round nav segments, full-round dropdown triggers, 8px cards, and the
 * week's 4.8px sticker bars. A stadium corner is a strong shape and it was
 * being spent on five different controls that have nothing to do with each
 * other, so nothing was distinguished by it.
 *
 * `rounded-sm` is the smallest step of the `--radius` family — 4.8px off an
 * 8px base — and it is what the week view already draws its named sticker bars
 * with. Picking the shape the calendar had rather than inventing a sixth one
 * means the nav, Trends' lenses and the two dropdowns now turn the same corner
 * as the thing they are all made of.
 *
 * Round is still round where round is the *drawing* rather than the chrome:
 * sticker discs, day numerals, area dots, the avatar and the theme toggle are
 * circles on purpose, and the bar charts keep their stadium ends.
 *
 * "Pill" survives in the names below as what this control *is* — one of a few
 * choices, all on screen — not as the shape it's cut to.
 */
const CONTROL_RADIUS = "rounded-sm";

/**
 * A segment of the top nav's pill, on a wide screen.
 *
 * It used to claim the pill shape for top-level navigation alone, and that
 * rule is gone: Trends' Areas · Habits · Moods is a segmented pill now too, and
 * so is the phone's bottom bar. Both of those are the *tracked* pill below —
 * `PILL_TRACK` and `pill` — which is a different drawing from this one, a
 * sunken track with a raised white thumb rather than a tinted segment on bare
 * ground. The nav keeps this lighter version so the two pills on a wide
 * Trends page don't read as the same control twice.
 *
 * Written as a function rather than three exported strings because the on/off
 * pair is the actual unit: an `active` segment that forgot to stop being muted
 * is the bug this prevents, and it's easy to write twice.
 *
 * `outline-none` with an explicit ring, because the default focus outline
 * traces the pill's rounded box tightly enough to read as a border, and a
 * segmented control with a border on one segment looks like a state rather than
 * like focus.
 */
export function segment(active: boolean): string {
  return `${CONTROL_RADIUS} px-5 py-1.5 text-[0.875rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
    active ? "bg-secondary text-ink" : "text-ink-muted hover:text-ink"
  }`;
}

/**
 * The tracked pill: a sunken track holding equal segments, with the chosen one
 * lifted out of it as a white thumb.
 *
 * Two tenants, and they are the reason it is a constant: Trends' three lenses
 * and the phone's bottom bar. The bottom bar was an icon-over-word row and
 * became this so that the phone's navigation and the one control on Trends
 * look like the same kind of thing — which they are, a choice of one from a
 * few that stay on screen.
 *
 * The track uses the shared selected-state surface. That keeps it in the same
 * neutral family as calendar hovers and active navigation rather than deriving
 * a faint brown from the warm text ink.
 *
 * Only the active segment has a shadow, and it is the only one on the screen:
 * one soft pixel that says "this one is on top" and nothing else.
 */
export const PILL_TRACK = `${CONTROL_RADIUS} bg-secondary p-1`;

/**
 * One segment of `PILL_TRACK`. 38px tall — with the track's 4px either side
 * the control is 46px, over the 44px touch floor.
 *
 * `bg-surface` and not the page's `bg-background`: the thumb is the pure-white
 * layer lifted one step above the off-white page.
 */
export function pill(active: boolean): string {
  return `flex h-[38px] min-w-0 items-center justify-center gap-1.5 ${CONTROL_RADIUS} px-2 text-[0.84rem] outline-none transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50 ${
    active
      ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(30_30_28/0.10)]"
      : "text-ink-label hover:text-ink"
  }`;
}

/**
 * The page's own title: the day, the week, or the month.
 *
 * Three views set it and they have to agree, which is the ordinary reason a
 * string like this exists. The reason it is *two* sizes is the week: "13 – 19
 * September 2026" is twenty-two characters, and at 48px that is 500px of type
 * on a 335px page. The month and the day fit at any size; the week is the one
 * that decides, and a title that truncates on one view of three is worse than
 * a title that is 32px on all of them.
 *
 * It takes over at the same 64rem the nav, the gutter and the two grids change
 * at — the phone's layout is one decision, made in one place, and this is one
 * of the things it decides.
 *
 * No line-height here, deliberately. Both call sites pull the line box open to
 * 1.25 and take the extra straight back off as negative margin, because
 * the heading face's descenders hang below a line box set to the em — see the
 * long note in `PeriodHeader`. That correction is written in ems, so it
 * follows whichever of these two sizes is in force; putting a fixed leading
 * here would fight it.
 */
export const PAGE_TITLE = "font-heading text-[2rem] lg:text-page-title";
