import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Reference } from "./Reference";

export const metadata: Metadata = {
  title: "system · baby steps",
  robots: { index: false },
};

/** Comma-separated emails that may see this page in production. */
const ALLOWED = (process.env.DEV_SYSTEM_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/** Living design-system reference. Dev, or an allow-listed email; 404 otherwise. */
export default async function SystemPage() {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : "";
    if (!email || !ALLOWED.includes(email)) notFound();
  }

  return <Reference />;
}
