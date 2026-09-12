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
 */
export const PAGE_WIDTH = "mx-auto w-full max-w-(--breakpoint-2xl) px-10";

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
 * five rounded white boxes on a cream page, which is five objects announcing
 * themselves where there are only three answers.
 *
 * So a panel here is a heading with a rule over it. No fill, because the page's
 * own cream is a perfectly good ground and a white box on it is a claim that
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
 * Thin lines inside a panel are still right: `AreaTable`'s rows are divided by
 * hairlines, and that is the same grammar one level down — thick says "a new
 * thing starts here", thin says "and it has parts".
 */
export const PANEL = `${RULE} pt-4`;

/**
 * A segment of a pill. The nav's three sections, and nothing else.
 *
 * It had a second tenant — the Trends chart switcher — and outliving it is the
 * useful part of this note, because the appearance is now load-bearing in the
 * other direction. **The pill means top-level navigation.** Trends has tabs of
 * its own now (Areas, Habits, Moods) and they are deliberately *not* drawn with
 * this: they are the underlined `variant="line"` tabs, the same ones
 * `MarkPicker` uses inside its popover. Two segmented pills on one screen read
 * as two levels of navigation and you have to remember which one holds what —
 * which is exactly why the Month/Week pill left the calendar for the nav. One
 * pill per screen, and it is this one.
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
  return `rounded-full px-5 py-1.5 text-[0.875rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
    active ? "bg-secondary text-ink" : "text-ink-muted hover:text-ink"
  }`;
}
