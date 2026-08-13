import { createClient } from "@/lib/supabase/server";

export type LifeArea = {
  id: string;
  name: string;
  slug: string;
  colorKey: string;
  sortOrder: number;
};

/**
 * The signed-in user's life areas, in display order.
 *
 * There is no `.eq("user_id", …)` here on purpose. Row-level security adds that
 * filter inside Postgres, on every query, whether or not the caller remembers.
 * Writing it here too would work, but it would suggest the safety comes from
 * this file — and then the day someone forgets it, nothing catches them.
 */
export async function getLifeAreas(): Promise<LifeArea[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_areas")
    .select("id, name, slug, color_key, sort_order")
    .order("sort_order");

  if (error) {
    throw new Error(`Could not load life areas: ${error.message}`);
  }

  // Postgres is snake_case, the app is camelCase. One conversion point, here,
  // so nothing downstream has to know what the column is called.
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    colorKey: row.color_key,
    sortOrder: row.sort_order,
  }));
}
