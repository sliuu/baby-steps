import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { CalendarSkeleton } from "@/components/views/CalendarSkeleton";
import { CalendarView } from "@/components/views/CalendarView";
import { TrendsSkeleton } from "@/components/views/TrendsSkeleton";
import { TrendsView } from "@/components/views/TrendsView";
import { createClient } from "@/lib/supabase/server";
import { toSessionUser } from "@/lib/user";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already bounced signed-out visitors, so this should never fire.
  // It stays anyway: the proxy is an optimistic pre-filter, and the real check
  // belongs next to the data. Next.js docs are explicit that proxy alone is
  // not an authorization boundary.
  //
  // It also has to stay *above* the Suspense boundaries below, and that's a
  // rule rather than a preference. Once a fallback renders, the response has
  // already committed to `200 OK` and the headers are gone — a `redirect()`
  // after that point degrades from an HTTP redirect into a client-side one.
  // The auth check is a single fast call, so paying for it before the shell
  // paints is cheap; the two page queries are the slow pair, and those are
  // what the boundaries are for.
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={toSessionUser(user)}
      // Each view gets its own boundary, so the nav and the page frame paint
      // as soon as the auth check returns rather than waiting on Postgres.
      // Sibling boundaries resolve independently — neither tab blocks the
      // other, which matters because both are rendered on the server even
      // though only one is on screen.
      //
      // These are props rather than children, and that's what makes the
      // arrangement work at all: `AppShell` is a Client Component, so anything
      // it imported would be pulled into the browser bundle. Passed in from
      // here, both views — and both fallbacks — are rendered on the server and
      // arrive as finished output. The switcher ships; the pages don't.
      calendar={
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarView />
        </Suspense>
      }
      trends={
        <Suspense fallback={<TrendsSkeleton />}>
          <TrendsView />
        </Suspense>
      }
    />
  );
}
