import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/redirects";

/** OAuth return: swap the one-time `?code=` for tokens in httpOnly cookies (no JS access). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // Relative only: an absolute URL would be an open redirect with a fresh session.
  const next = safeInternalPath(searchParams.get("next"));

  // Consent "cancel" arrives as ?error=access_denied, no code.
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
