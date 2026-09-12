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
 * It was 7xl and px-8, chosen so the calendar grid kept roughly its pre-rail
 * width once the rail took 18rem out of the row. 6xl gives 8rem of that back to
 * the margin — the grid is correspondingly narrower, which is the trade being
 * made on purpose: a month is a fixed 7 columns, so it doesn't need the width,
 * it just fills it.
 */
export const PAGE_WIDTH = "mx-auto w-full max-w-6xl px-10";

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
