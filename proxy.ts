import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/** Next 16 `middleware.ts`: refresh session; signed-out → /login, new → /onboarding. */

/** Reachable signed out. `/demo` is generated data, nobody's rows. */
const PUBLIC_PATHS = [
  "/login",
  "/demo",
  // Gated by the page itself (dev or allow-list; 404 otherwise).
  "/dev",
  "/auth/callback",
  "/auth/auth-code-error",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  // No session check needed; `/login` still redirects signed-in visitors.
  if (isPublic && path !== "/login") {
    return NextResponse.next({ request });
  }

  const { url, anonKey } = supabaseEnv();

  // Pass-through; `setAll` replaces it on refresh.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Request too, so this render sees the new token.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Keeps a CDN from serving one visitor's cookie to another.
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // Verifies locally (asymmetric keys) and refreshes near expiry.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn && !isPublic) {
    const loginUrl = new URL("/login", request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && path === "/login") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // One PK lookup; no row or an error lets them through.
  if (signedIn && !isPublic && path !== "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("user_id", data!.claims.sub)
      .maybeSingle();
    if (profile && profile.onboarded_at === null) {
      return redirectKeepingCookies(new URL("/onboarding", request.nextUrl), response);
    }
  }

  // Must be `setAll`'s response, or a refreshed token is dropped.
  return response;
}

/** Redirect that carries any refreshed session cookies along. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const [name, value] of from.headers) {
    if (name !== "set-cookie" && /cache|expires|pragma/i.test(name)) redirect.headers.set(name, value);
  }
  return redirect;
}

export const config = {
  matcher: [
    // Skips build output, images, favicon.ico (probed even though it's gone), and
    // apple-icon (generated, no extension; a redirect breaks the iOS tile).
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
