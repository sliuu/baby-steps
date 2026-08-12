/**
 * Supabase connection values, read once and checked once.
 *
 * These must be written as literal `process.env.NEXT_PUBLIC_…` expressions.
 * Next.js does a find-and-replace on that exact text at build time and bakes
 * the value into the bundle — there is no `process.env` object left in the
 * browser to look things up in. So a dynamic read like `process.env[name]`
 * compiles fine and is `undefined` at runtime, in the browser only, which is
 * a genuinely horrible bug to chase.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseEnv() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server — " +
        "Next only reads env files at startup. See OAuthSetup.md §5.",
    );
  }

  return { url, anonKey };
}
