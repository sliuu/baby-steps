import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/**
 * The Supabase client for code running in the browser.
 *
 * Deliberately not configuring `cookies` here — the browser client reads and
 * writes `document.cookie` on its own, and overriding that is how you end up
 * with two disagreeing ideas of who is signed in.
 *
 * A function rather than a shared singleton: a module-level client would be
 * created once per server process and shared across every visitor, which is
 * exactly wrong for something holding a session.
 */
export function createClient() {
  const { url, anonKey } = supabaseEnv();

  return createBrowserClient(url, anonKey);
}
