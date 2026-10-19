"use server";

import { refresh } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { readDraft, validateDraft, type DraftField } from "@/lib/stickers";

/** Shared by both writers. `field` null = no input to mark (signed out, DB error). */
export type SaveResult =
  | { ok: true }
  | { ok: false; field: DraftField | null; message: string };

/** Postgres SQLSTATE codes. */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** Verify the session locally when asymmetric JWT signing is available. */
async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

/**
 * Make a new sticker. Re-validates: a Server Action is a public POST endpoint.
 * Category ownership is enforced by the (life_area_id, user_id) FK, not here.
 */
export async function createActivity(
  formData: FormData,
): Promise<SaveResult> {
  const check = validateDraft(readDraft(formData));
  if (!check.ok) {
    return { ok: false, field: check.field, message: check.message };
  }
  // The trimmed draft from the validator.
  const { name, mark, categoryId } = check.draft;

  const { supabase, userId } = await signedInClient();
  if (!userId) {
    return { ok: false, field: null, message: "You're signed out." };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: userId,
    life_area_id: categoryId,
    name,
    mark,
  });

  if (error) {
    // User-fixable refusals get a field; anything else is generic.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        field: "name",
        message: `You already have a sticker called “${name}” in that category.`,
      };
    }
    if (
      error.code === FOREIGN_KEY_VIOLATION ||
      error.code === INVALID_TEXT_REPRESENTATION
    ) {
      return {
        ok: false,
        field: "category",
        message: "That category isn't one of yours.",
      };
    }
    return {
      ok: false,
      field: null,
      message: "That sticker didn't save. Try again.",
    };
  }

  // Re-renders the tray in this response. Not optimistic: the DB makes the id.
  refresh();
  return { ok: true };
}

/** Edit a sticker. `activityId` isn't part of the draft. RLS gates ownership. */
export async function updateActivity(
  activityId: string,
  formData: FormData,
): Promise<SaveResult> {
  const check = validateDraft(readDraft(formData));
  if (!check.ok) {
    return { ok: false, field: check.field, message: check.message };
  }
  const { name, mark, categoryId } = check.draft;

  const { supabase, userId } = await signedInClient();
  if (!userId) {
    return { ok: false, field: null, message: "You're signed out." };
  }

  const { data, error } = await supabase
    .from("activities")
    .update({ life_area_id: categoryId, name, mark })
    .eq("id", activityId)
    // Under RLS, someone else's row updates zero rows without erroring.
    .select("id");

  if (error) {
    // Unique is (user_id, life_area_id, name): rename or move can hit it.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        field: "name",
        message: `You already have a sticker called “${name}” in that category.`,
      };
    }
    if (
      error.code === FOREIGN_KEY_VIOLATION ||
      error.code === INVALID_TEXT_REPRESENTATION
    ) {
      return {
        ok: false,
        field: "category",
        message: "That category isn't one of yours.",
      };
    }
    return {
      ok: false,
      field: null,
      message: "That sticker didn't save. Try again.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      field: null,
      message: "That sticker isn't there any more.",
    };
  }

  // Edited marks are already on days; refresh re-renders the whole page.
  refresh();
  return { ok: true };
}

/** Retire or restore a sticker. History stays; only the tray stops offering it. */
export async function setArchived(
  activityId: string,
  archived: boolean,
): Promise<SaveResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) {
    return { ok: false, field: null, message: "You're signed out." };
  }

  // Zero rows = filtered by RLS (see updateActivity).
  const { data, error } = await supabase
    .from("activities")
    .update({ archived })
    .eq("id", activityId)
    .select("id");

  if (error) {
    return {
      ok: false,
      field: null,
      message: archived
        ? "That sticker didn't archive. Try again."
        : "That sticker didn't come back. Try again.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      field: null,
      message: "That sticker isn't there any more.",
    };
  }

  refresh();
  return { ok: true };
}

/**
 * Delete a sticker and, via the FK cascade, every mark made with it. No undo.
 * RLS gates ownership; zero rows means it was filtered out.
 */
export async function deleteActivity(activityId: string): Promise<SaveResult> {
  const { supabase, userId } = await signedInClient();
  if (!userId) {
    return { ok: false, field: null, message: "You're signed out." };
  }

  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .select("id");

  if (error) {
    return {
      ok: false,
      field: null,
      message: "That sticker didn't delete. Try again.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      field: null,
      message: "That sticker isn't there any more.",
    };
  }

  refresh();
  return { ok: true };
}
