import type { User } from "@supabase/supabase-js";

/**
 * The slice of the Supabase user we actually render.
 *
 * Deliberately small. The full `User` object carries tokens, provider
 * metadata, and identity records — none of which the nav needs, and all of
 * which would cross into the client bundle if we passed the whole thing down.
 */
export type SessionUser = {
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Fallback shown when there's no avatar image. */
  initial: string;
};

export function toSessionUser(user: User): SessionUser {
  // Google and GitHub don't agree on what to call things, so check both.
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
    // Intl.Segmenter, not [0] — an emoji or accented character in a display
    // name is several code units, and slicing one would render a broken glyph.
    // Same reasoning we'll apply to sticker marks in Step 10.
    initial: firstGrapheme(label).toUpperCase() || "?",
  };
}

function firstGrapheme(value: string): string {
  if (!value) return "";
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const [first] = segmenter.segment(value);
  return first?.segment ?? "";
}
