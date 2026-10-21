/** Page gutter and cap (2xl, 1536px), shared by header and body. */
export const PAGE_WIDTH =
  "mx-auto w-full max-w-(--breakpoint-2xl) px-s4 sm:px-s6 xl:px-s7";

/** Page titles: Today's question, the calendar period, trends. Light italic, in ink. */
export const TITLE = "font-display text-page-title font-light italic text-ink";

/** A section's title under a page title: the same face, a step down. */
export const SECTION_TITLE = "font-display text-body-lg font-light italic text-ink";

/** The wordmark: 1.5rem, 400, every page. */
export const LOGO = "flex items-end gap-s1 font-heading text-logo text-ink";

/** A section starts here: 1px rule along the top. Composes with `border-dashed`. */
export const RULE = "border-t border-rule";

/** A section: the rule and its air. No box. */
export const PANEL = `${RULE} pt-s4`;
