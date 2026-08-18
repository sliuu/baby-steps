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
