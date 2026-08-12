import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "./env";

/**
 * The Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Async because `cookies()` is a promise in Next 16 — synchronous access was
 * deprecated in 15 and removed in 16.
 *
 * Every caller gets a fresh client bound to *this* request's cookies. Sharing
 * one across requests would leak one visitor's session into another's page.
 */
export async function createClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components are not allowed to write cookies — the HTML may
          // already be streaming by the time we get here. That's fine and
          // expected: proxy.ts runs before every request and refreshes the
          // session there, where writing to the response is still legal.
          // Swallowing this is only safe *because* the proxy exists.
        }
      },
    },
  });
}
