/** A starting idea: a name and a mark, nothing stored. */
export type Suggestion = { name: string; mark: string };

/** The six seeded category slugs. */
export type CategorySlug =
  | "spirituality"
  | "exercise"
  | "work"
  | "creativity"
  | "romance"
  | "friends";

/** Starting ideas per category slug. Picking one creates a normal activity
 *  row owned by the user; nothing here is stored or referenced later. */
// copy: TODO — placeholders until Stephanie writes the list.
export const SUGGESTIONS: Record<CategorySlug, Suggestion[]> = {
  spirituality: [
    { name: "meditate", mark: "icon:lotus" },
    { name: "journal", mark: "icon:notebook-pen" },
    { name: "pray", mark: "icon:hand-heart" },
    { name: "gratitude", mark: "icon:sparkles" },
    { name: "walk outside", mark: "icon:trees" },
  ],
  exercise: [
    { name: "gym", mark: "icon:dumbbell" },
    { name: "run", mark: "icon:footprints" },
    { name: "yoga", mark: "icon:person-standing" },
    { name: "bike", mark: "icon:bike" },
    { name: "swim", mark: "icon:waves-ladder" },
  ],
  work: [
    { name: "deep work", mark: "icon:brain" },
    { name: "inbox zero", mark: "icon:inbox" },
    { name: "learn something", mark: "icon:book-open" },
    { name: "plan the week", mark: "icon:calendar-check" },
  ],
  creativity: [
    { name: "draw", mark: "icon:pen-tool" },
    { name: "piano", mark: "icon:piano" },
    { name: "write", mark: "icon:feather" },
    { name: "cook", mark: "icon:chef-hat" },
    { name: "photography", mark: "icon:camera" },
  ],
  romance: [
    { name: "date night", mark: "icon:heart" },
    { name: "hike", mark: "icon:mountain" },
    { name: "try somewhere new", mark: "icon:map-pin" },
    { name: "travel", mark: "icon:plane" },
  ],
  friends: [
    { name: "call family", mark: "icon:phone-call" },
    { name: "see friends", mark: "icon:users" },
    { name: "host dinner", mark: "icon:utensils" },
    { name: "write a letter", mark: "icon:mail" },
  ],
};

const key = (name: string) => name.trim().toLowerCase();

/** True for one of the six seeded slugs. */
export function isCategorySlug(slug: string): slug is CategorySlug {
  return Object.hasOwn(SUGGESTIONS, slug);
}

/** Suggestions for a category, minus names the user already has
 *  (case-insensitive, trimmed; stricter than the exact-match unique index).
 *  Unknown slugs (a renamed or custom category) get none. */
export function suggestionsFor(slug: string, existing: string[]): Suggestion[] {
  if (!isCategorySlug(slug)) return [];
  const owned = new Set(existing.map(key));
  return SUGGESTIONS[slug].filter((s) => !owned.has(key(s.name)));
}
