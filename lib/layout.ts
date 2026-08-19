/**
 * The page gutter, in one place.
 *
 * The nav and the page body have to agree on it — the wordmark sits directly
 * above the calendar's left edge, and a mismatch between the two is the kind of
 * misalignment you see immediately and hunt for a while. It was duplicated in
 * two files until the calendar grew a right rail and needed a wider page.
 *
 * max-w-7xl rather than 5xl so the grid keeps roughly its old width once the
 * rail takes its 16rem out of the row.
 */
export const PAGE_WIDTH = "mx-auto w-full max-w-7xl px-8";

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
