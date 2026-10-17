/** The six category inks. Names are the `--cat-*` tokens in globals.css. */
export type CategoryColor = "oxblood" | "bottle" | "mustard" | "rose" | "sage" | "plum";

// Written out in full: Tailwind only generates classes it finds as literal text.
// `wash` is the highlight tint behind marked days.
export const CATEGORY_COLORS = {
  oxblood: { ink: "bg-cat-oxblood", text: "text-cat-oxblood-text", textFill: "fill-cat-oxblood-text", on: "text-cat-oxblood-on", fill: "fill-cat-oxblood", stroke: "stroke-cat-oxblood", dot: "bg-cat-oxblood", wash: "bg-cat-oxblood/15" },
  bottle: { ink: "bg-cat-bottle", text: "text-cat-bottle-text", textFill: "fill-cat-bottle-text", on: "text-cat-bottle-on", fill: "fill-cat-bottle", stroke: "stroke-cat-bottle", dot: "bg-cat-bottle", wash: "bg-cat-bottle/15" },
  mustard: { ink: "bg-cat-mustard", text: "text-cat-mustard-text", textFill: "fill-cat-mustard-text", on: "text-cat-mustard-on", fill: "fill-cat-mustard", stroke: "stroke-cat-mustard", dot: "bg-cat-mustard", wash: "bg-cat-mustard/15" },
  rose: { ink: "bg-cat-rose", text: "text-cat-rose-text", textFill: "fill-cat-rose-text", on: "text-cat-rose-on", fill: "fill-cat-rose", stroke: "stroke-cat-rose", dot: "bg-cat-rose", wash: "bg-cat-rose/15" },
  sage: { ink: "bg-cat-sage", text: "text-cat-sage-text", textFill: "fill-cat-sage-text", on: "text-cat-sage-on", fill: "fill-cat-sage", stroke: "stroke-cat-sage", dot: "bg-cat-sage", wash: "bg-cat-sage/15" },
  plum: { ink: "bg-cat-plum", text: "text-cat-plum-text", textFill: "fill-cat-plum-text", on: "text-cat-plum-on", fill: "fill-cat-plum", stroke: "stroke-cat-plum", dot: "bg-cat-plum", wash: "bg-cat-plum/15" },
} as const satisfies Record<CategoryColor, Record<string, string>>;

const FALLBACK: CategoryColor = "bottle";

/** The DB still stores the old hue names (production shares it); map them on read. */
const DB_KEY: Record<string, CategoryColor> = {
  red: "oxblood",
  blue: "bottle",
  orange: "mustard",
  yellow: "rose",
  green: "sage",
  purple: "plum",
};

export function isCategoryColor(key: string): key is CategoryColor {
  return key in CATEGORY_COLORS;
}

/** A `color_key` from the database, as a category colour. */
export function fromDbColorKey(key: string): CategoryColor {
  if (isCategoryColor(key)) return key;
  return DB_KEY[key] ?? FALLBACK;
}

/** Classes for a colour key; unknown keys get the fallback. */
export function categoryColor(colorKey: string) {
  return CATEGORY_COLORS[isCategoryColor(colorKey) ? colorKey : fromDbColorKey(colorKey)];
}

/** Highlight wash: the category ink at 15%. `null` = neutral selected surface. */
export function wash(colorKey: string | null): string {
  return colorKey ? categoryColor(colorKey).wash : "bg-secondary";
}
