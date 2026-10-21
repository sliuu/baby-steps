"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { petalRuleError, type PetalRule } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type SettingsResult = { ok: boolean; message: string } | undefined;

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

async function saveProfile(
  fields: Record<string, unknown>,
  what: string,
): Promise<SettingsResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, ...fields });
  if (error) {
    console.error(`${what} save failed`, {
      message: error.message,
      code: error.code,
    });
    return { ok: false, message: "that didn't save. try again." };
  }
  revalidatePath("/");
  return { ok: true, message: "saved." };
}

/** One save for petals and week start. */
export async function saveSettings(
  _: SettingsResult,
  form: FormData,
): Promise<SettingsResult> {
  const rule: PetalRule = {
    weeks: Number(form.get("weeks")),
    small: Number(form.get("small")),
    medium: Number(form.get("medium")),
    large: Number(form.get("large")),
  };
  const ruleError = petalRuleError(rule);
  if (ruleError) return { ok: false, message: ruleError };

  return saveProfile(
    {
      petal_weeks: rule.weeks,
      petal_small: rule.small,
      petal_medium: rule.medium,
      petal_large: rule.large,
      week_starts_on: form.get("weekStartsOn") === "1" ? 1 : 0,
    },
    "Settings",
  );
}

/** Typed confirmation; the RPC cascades every row. */
export async function deleteAccount(
  _: SettingsResult,
  form: FormData,
): Promise<SettingsResult> {
  if (
    String(form.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== "delete"
  ) {
    return { ok: false, message: "type “delete” to confirm." };
  }
  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "you're signed out." };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account delete failed", {
      message: error.message,
      code: error.code,
    });
    return {
      ok: false,
      message: "that didn't work. nothing was deleted; try again.",
    };
  }
  // The user row is gone; clear the cookie locally.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
