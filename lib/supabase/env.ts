// Literal `process.env.NEXT_PUBLIC_*` only: Next inlines them; dynamic reads are undefined.
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
