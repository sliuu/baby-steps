/** Page gutter and cap, shared by header and body. Cap is the 2xl breakpoint (1536px). */
export const PAGE_WIDTH =
  "mx-auto w-full max-w-(--breakpoint-2xl) px-5 sm:px-10 xl:px-20";

/** The wordmark. Size per call site. */
export const LOGO = "font-heading font-light leading-none text-ink";

/** A section starts here: 1px rule along the top. Composes with `border-dashed`. */
export const RULE = "border-t border-rule";

/** A section: the rule and its air. No box. */
export const PANEL = `${RULE} pt-5`;
