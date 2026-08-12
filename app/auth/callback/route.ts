import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends the browser after Google or GitHub has authenticated you.
 *
 * The URL arrives carrying a short-lived `?code=`. That code is not a session —
 * it's a one-time voucher. We swap it for real tokens here, on the server, and
 * the tokens go straight into httpOnly cookies. They never touch JavaScript,
 * so a cross-site scripting bug can't read them.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // Where to land afterwards. Relative paths only — an absolute URL here would
  // let someone craft a link that bounces you to their site carrying a fresh
  // session. Same reasoning as Supabase's redirect allow-list.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  // The provider reports refusals here too — "cancel" on Google's consent
  // screen arrives as ?error=access_denied, with no code.
  const error = searchParams.get("error");
  if (error) {
    const description =
      searchParams.get("error_description") ?? "Sign-in was cancelled.";
    return NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?reason=${encodeURIComponent(description)}`,
        origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=No+code+was+returned.", origin),
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?reason=${encodeURIComponent(exchangeError.message)}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, origin));
}
