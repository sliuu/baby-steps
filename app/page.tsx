import { Suspense } from "react";
import { redirect } from "next/navigation";

import { addStarterStickers, finishTour } from "@/app/actions/onboarding";
import { AppShell } from "@/components/AppShell";
import { UserMenu } from "@/components/UserMenu";
import { CalendarSkeleton } from "@/components/views/CalendarSkeleton";
import { CalendarView } from "@/components/views/CalendarView";
import { TrendsSkeleton } from "@/components/views/TrendsSkeleton";
import { TrendsView } from "@/components/views/TrendsView";
import { settingsFromRow } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { toSessionUser } from "@/lib/user";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Real auth check (proxy is only a pre-filter). Must stay above Suspense:
  // after a fallback streams, redirect() is client-side, not an HTTP redirect.
  if (!claims) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").maybeSingle();

  return (
    <AppShell
      settings={settingsFromRow(profile)}
      // Until finished or skipped once; no row (an old account) means no tour.
      tour={profile && profile.onboarded_at === null ? { user: claims.sub, save: addStarterStickers, finish: finishTour } : undefined}
      navEnd={<UserMenu user={toSessionUser(claims)} />}
      // Props, not imports, so both views render on the server; one boundary
      // each so neither blocks the shell or the other.
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
