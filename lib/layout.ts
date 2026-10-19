/** Page gutter and cap (2xl, 1536px), shared by header and body. */
export const PAGE_WIDTH =
  "mx-auto w-full max-w-(--breakpoint-2xl) px-s4 sm:px-s6 xl:px-s7";

/** The wordmark: 1.5rem, 400, every page. */
export const LOGO = "flex items-end gap-s1 font-heading text-logo text-ink";

/** A section starts here: 1px rule along the top. Composes with `border-dashed`. */
export const RULE = "border-t border-rule";

/** A section: the rule and its air. No box. */
export const PANEL = `${RULE} pt-s4`;
