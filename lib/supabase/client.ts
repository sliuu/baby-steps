import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "./env";

/** Browser client. No `cookies` override (it uses document.cookie); not a singleton. */
export function createClient() {
  const { url, anonKey } = supabaseEnv();

  return createBrowserClient<Database>(url, anonKey);
}
