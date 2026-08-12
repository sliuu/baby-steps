"use client";

import { useState } from "react";
import { TopNav } from "./TopNav";
import type { Page } from "@/lib/nav";
import type { SessionUser } from "@/lib/user";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
  user: SessionUser;
};

/**
 * The only stateful thing in the shell.
 *
 * The two views arrive as props, not imports. That matters: a component
 * imported here would be pulled into the client bundle, but one passed in
 * from a Server Component is rendered on the server and handed over as
 * finished output. The switcher ships to the browser; the pages don't have to.
 *
 * `user` is plain data rather than a rendered node — it's small, and TopNav
 * needs the individual fields, not finished markup.
 */
export function AppShell(props: Props) {
  const [page, setPage] = useState<Page>("calendar");

  return (
    <>
      <TopNav page={page} onPageChange={setPage} user={props.user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-14">
        {page === "calendar" ? props.calendar : props.trends}
      </main>
    </>
  );
}
