import type { User } from "@supabase/supabase-js";

import { firstGrapheme } from "@/lib/graphemes";

/** What we render of the user; kept small so tokens never reach the client. */
export type SessionUser = {
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Fallback shown when there's no avatar image. */
  initial: string;
};

type UserProfile = {
  email?: string;
  user_metadata?: User["user_metadata"];
};

export function toSessionUser(user: UserProfile): SessionUser {
  // Providers name these differently.
  const metadata = user.user_metadata ?? {};
  const name: string =
    metadata.full_name ?? metadata.name ?? metadata.user_name ?? "";
  const email = user.email ?? "";
  const avatarUrl: string | null =
    metadata.avatar_url ?? metadata.picture ?? null;

  const label = name || email;

  return {
    email,
    name: name || email,
    avatarUrl,
    // Grapheme, not [0]: emoji/accents span several code units.
    initial: firstGrapheme(label).toUpperCase() || "?",
  };
}
