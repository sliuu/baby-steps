"use server";

import { redirect } from "next/navigation";

import { toE164 } from "@/lib/phone";
import { validateDraft } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

export type StepResult = { ok: boolean; message: string } | undefined;

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Whether the newest snapshot already holds these levels (back, then next again). */
async function sameAsLatest(
  supabase: Supabase,
  userId: string,
  rows: { category_id: string; level: number }[],
): Promise<boolean> {
  const { data: newest } = await supabase
    .from("category_ratings")
    .select("rated_at")
    .eq("user_id", userId)
    .order("rated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!newest) return false;

  const { data: latest } = await supabase
    .from("category_ratings")
    .select("category_id, level")
    .eq("user_id", userId)
    .eq("rated_at", newest.rated_at);
  if (!latest || latest.length !== rows.length) return false;

  const was = new Map(latest.map((row) => [row.category_id, row.level]));
  return rows.every((row) => was.get(row.category_id) === row.level);
}

/** Step 1: one rating row per category, all with the same timestamp. */
export async function saveRatings(levels: Record<string, number>): Promise<StepResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };

  const ratedAt = new Date().toISOString();
  const rows = Object.entries(levels)
    .filter(([, level]) => Number.isInteger(level) && level >= 0 && level <= 3)
    .map(([categoryId, level]) => ({
      user_id: userId,
      category_id: categoryId,
      level,
      rated_at: ratedAt,
    }));

  if (rows.length > 0 && !(await sameAsLatest(supabase, userId, rows))) {
    const { error } = await supabase.from("category_ratings").insert(rows);
    if (error) {
      console.error("Ratings insert failed", { message: error.message, code: error.code });
      return { ok: false, message: "that didn't save. try again." };
    }
  }
  redirect("/onboarding?step=2");
}

export type Pick = { categoryId: string; name: string; mark: string };

/** Step 2: create the chosen activities; ones you already have are skipped. */
export async function addActivities(picks: Pick[]): Promise<StepResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };

  const rows = [];
  for (const pick of picks) {
    const check = validateDraft(pick);
    if (!check.ok) return { ok: false, message: `“${pick.name}”: ${check.message.toLowerCase()}` };
    rows.push({
      user_id: userId,
      life_area_id: check.draft.categoryId,
      name: check.draft.name,
      mark: check.draft.mark,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("activities")
      .upsert(rows, { onConflict: "user_id,life_area_id,name", ignoreDuplicates: true });
    if (error) {
      console.error("Onboarding activities failed", { message: error.message, code: error.code });
      return { ok: false, message: "those didn't save. try again." };
    }
  }
  redirect("/onboarding?step=3");
}

/** Step 3: "texts" stores the number and consent (nothing is sent); "done" finishes. */
export async function finishOnboarding(_: StepResult, form: FormData): Promise<StepResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };

  if (form.get("intent") === "texts") {
    const phone = toE164(String(form.get("phone") ?? ""));
    if (!phone) return { ok: false, message: "that doesn't look like a us phone number." };
    if (form.get("optIn") !== "on") {
      return { ok: false, message: "tick “text me reminders” to save a number." };
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, phone, texts_opt_in: true });
    if (error) {
      console.error("Phone save failed", { message: error.message, code: error.code });
      return { ok: false, message: "that didn't save. try again." };
    }
    return { ok: true, message: "saved. we'll text you once texting is live." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, onboarded_at: new Date().toISOString() });
  if (error) {
    console.error("Profile update failed", { message: error.message, code: error.code });
    return { ok: false, message: "that didn't save. try again." };
  }
  redirect("/");
}
