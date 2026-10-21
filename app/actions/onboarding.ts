"use server";

import { refresh } from "next/cache";

import { validateDraft } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

export type StepResult = { ok: boolean; message: string } | undefined;

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

export type Pick = { categoryId: string; name: string; mark: string };

/** The tour's starter stickers; ones you already have are skipped. Stays on the page. */
export async function addStarterStickers(picks: Pick[]): Promise<StepResult> {
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
      console.error("Starter stickers failed", { message: error.message, code: error.code });
      return { ok: false, message: "those didn't save. try again." };
    }
  }
  refresh();
  return { ok: true, message: "" };
}

/** Finished or skipped: either way the tour never shows again. */
export async function finishTour(): Promise<StepResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, onboarded_at: new Date().toISOString() });
  if (error) {
    console.error("Profile update failed", { message: error.message, code: error.code });
    return { ok: false, message: "that didn't save. try again." };
  }
  return { ok: true, message: "" };
}
