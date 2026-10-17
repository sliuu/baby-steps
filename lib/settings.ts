// Relative imports with extensions, for `node --test`.

export type WeekStart = 0 | 1;

/** Petal sizes: sticker counts over the last `weeks` calendar weeks. */
export type PetalRule = { weeks: number; small: number; medium: number; large: number };

export type Settings = { weekStartsOn: WeekStart; petals: PetalRule };

export const DEFAULT_SETTINGS: Settings = {
  weekStartsOn: 0,
  petals: { weeks: 3, small: 1, medium: 3, large: 6 },
};

export const PETAL_WEEK_CHOICES = [1, 2, 3, 4, 6, 8, 12];

/** Mirrors the DB checks; null when valid. */
export function petalRuleError(rule: PetalRule): string | null {
  const { weeks, small, medium, large } = rule;
  if (![weeks, small, medium, large].every(Number.isInteger)) return "use whole numbers.";
  if (weeks < 1 || weeks > 12) return "pick 1 to 12 weeks.";
  if (small < 1) return "small needs at least 1 sticker.";
  if (!(small < medium && medium < large)) return "each size needs more stickers than the one before.";
  if (large > 999) return "large can be at most 999.";
  return null;
}

type ProfileRow = {
  week_starts_on?: number | null;
  petal_weeks?: number | null;
  petal_small?: number | null;
  petal_medium?: number | null;
  petal_large?: number | null;
} | null;

/** A profiles row → Settings; missing columns fall back to defaults. */
export function settingsFromRow(row: ProfileRow): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    weekStartsOn: row?.week_starts_on === 1 ? 1 : 0,
    petals: {
      weeks: row?.petal_weeks ?? d.petals.weeks,
      small: row?.petal_small ?? d.petals.small,
      medium: row?.petal_medium ?? d.petals.medium,
      large: row?.petal_large ?? d.petals.large,
    },
  };
}
