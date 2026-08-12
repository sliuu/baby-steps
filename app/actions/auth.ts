"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign out.
 *
 * A Server Action, not a click handler. Server Actions are allowed to write
 * cookies — Server Components aren't — so this is a place the session cookie
 * can actually be cleared.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
