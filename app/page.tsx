import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { CalendarView } from "@/components/views/CalendarView";
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
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={toSessionUser(user)}
      calendar={<CalendarView />}
      trends={<TrendsView />}
    />
  );
}
