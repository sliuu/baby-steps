/** The six category inks. Names are the `--cat-*` tokens in globals.css. */
export type CategoryColor = "oxblood" | "bottle" | "mustard" | "rose" | "sage" | "plum";

// Written out in full: Tailwind only generates classes it finds as literal text.
// `soft`, `lit`, `tint`, `softFill`, `softStroke`, `bg` are legacy pastel aliases (plans 05–15 remove).
export const CATEGORY_COLORS = {
  oxblood: { ink: "bg-cat-oxblood", text: "text-cat-oxblood-text", on: "text-cat-oxblood-on", fill: "fill-cat-oxblood", stroke: "stroke-cat-oxblood", dot: "bg-cat-oxblood", bg: "bg-cat-oxblood", soft: "bg-cat-oxblood-soft", lit: "bg-cat-oxblood-soft/35", tint: "bg-cat-oxblood-tint", softFill: "fill-cat-oxblood-soft", softStroke: "stroke-cat-oxblood-soft" },
  bottle: { ink: "bg-cat-bottle", text: "text-cat-bottle-text", on: "text-cat-bottle-on", fill: "fill-cat-bottle", stroke: "stroke-cat-bottle", dot: "bg-cat-bottle", bg: "bg-cat-bottle", soft: "bg-cat-bottle-soft", lit: "bg-cat-bottle-soft/35", tint: "bg-cat-bottle-tint", softFill: "fill-cat-bottle-soft", softStroke: "stroke-cat-bottle-soft" },
  mustard: { ink: "bg-cat-mustard", text: "text-cat-mustard-text", on: "text-cat-mustard-on", fill: "fill-cat-mustard", stroke: "stroke-cat-mustard", dot: "bg-cat-mustard", bg: "bg-cat-mustard", soft: "bg-cat-mustard-soft", lit: "bg-cat-mustard-soft/35", tint: "bg-cat-mustard-tint", softFill: "fill-cat-mustard-soft", softStroke: "stroke-cat-mustard-soft" },
  rose: { ink: "bg-cat-rose", text: "text-cat-rose-text", on: "text-cat-rose-on", fill: "fill-cat-rose", stroke: "stroke-cat-rose", dot: "bg-cat-rose", bg: "bg-cat-rose", soft: "bg-cat-rose-soft", lit: "bg-cat-rose-soft/35", tint: "bg-cat-rose-tint", softFill: "fill-cat-rose-soft", softStroke: "stroke-cat-rose-soft" },
  sage: { ink: "bg-cat-sage", text: "text-cat-sage-text", on: "text-cat-sage-on", fill: "fill-cat-sage", stroke: "stroke-cat-sage", dot: "bg-cat-sage", bg: "bg-cat-sage", soft: "bg-cat-sage-soft", lit: "bg-cat-sage-soft/35", tint: "bg-cat-sage-tint", softFill: "fill-cat-sage-soft", softStroke: "stroke-cat-sage-soft" },
  plum: { ink: "bg-cat-plum", text: "text-cat-plum-text", on: "text-cat-plum-on", fill: "fill-cat-plum", stroke: "stroke-cat-plum", dot: "bg-cat-plum", bg: "bg-cat-plum", soft: "bg-cat-plum-soft", lit: "bg-cat-plum-soft/35", tint: "bg-cat-plum-tint", softFill: "fill-cat-plum-soft", softStroke: "stroke-cat-plum-soft" },
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

/** Highlight wash: the pastel at 35% so marks on top stay distinct. `null` = neutral selected surface. */
export function wash(colorKey: string | null): string {
  return colorKey ? categoryColor(colorKey).lit : "bg-secondary";
}
