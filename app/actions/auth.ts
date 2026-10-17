"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Server Action: only actions (not Server Components) can clear the cookie. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
