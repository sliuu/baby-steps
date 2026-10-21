/** The six category inks. Names are the `--cat-*` tokens in globals.css. */
export type CategoryColor = "plum" | "rose" | "mustard" | "slate" | "sage" | "amber";

// Written out in full: Tailwind only generates classes it finds as literal text.
// `wash` is the highlight tint behind marked days.
export const CATEGORY_COLORS = {
  plum: { ink: "bg-cat-plum", text: "text-cat-plum-text", textFill: "fill-cat-plum-text", on: "text-cat-plum-on", fill: "fill-cat-plum", stroke: "stroke-cat-plum", dot: "bg-cat-plum", border: "border-cat-plum", wash: "bg-cat-plum/15" },
  rose: { ink: "bg-cat-rose", text: "text-cat-rose-text", textFill: "fill-cat-rose-text", on: "text-cat-rose-on", fill: "fill-cat-rose", stroke: "stroke-cat-rose", dot: "bg-cat-rose", border: "border-cat-rose", wash: "bg-cat-rose/15" },
  mustard: { ink: "bg-cat-mustard", text: "text-cat-mustard-text", textFill: "fill-cat-mustard-text", on: "text-cat-mustard-on", fill: "fill-cat-mustard", stroke: "stroke-cat-mustard", dot: "bg-cat-mustard", border: "border-cat-mustard", wash: "bg-cat-mustard/15" },
  slate: { ink: "bg-cat-slate", text: "text-cat-slate-text", textFill: "fill-cat-slate-text", on: "text-cat-slate-on", fill: "fill-cat-slate", stroke: "stroke-cat-slate", dot: "bg-cat-slate", border: "border-cat-slate", wash: "bg-cat-slate/15" },
  sage: { ink: "bg-cat-sage", text: "text-cat-sage-text", textFill: "fill-cat-sage-text", on: "text-cat-sage-on", fill: "fill-cat-sage", stroke: "stroke-cat-sage", dot: "bg-cat-sage", border: "border-cat-sage", wash: "bg-cat-sage/15" },
  amber: { ink: "bg-cat-amber", text: "text-cat-amber-text", textFill: "fill-cat-amber-text", on: "text-cat-amber-on", fill: "fill-cat-amber", stroke: "stroke-cat-amber", dot: "bg-cat-amber", border: "border-cat-amber", wash: "bg-cat-amber/15" },
} as const satisfies Record<CategoryColor, Record<string, string>>;

const FALLBACK: CategoryColor = "slate";

/** The DB still stores the old hue names (production shares it); map them on read. */
// Keyed by category, not by hue: "red" is spirituality, now yellow.
const DB_KEY: Record<string, CategoryColor> = {
  red: "mustard", // spirituality
  blue: "sage", // exercise
  orange: "slate", // work
  yellow: "plum", // creativity & play
  green: "rose", // romance & adventure
  purple: "amber", // friends & family
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
