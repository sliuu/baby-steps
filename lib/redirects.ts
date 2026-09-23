/**
 * Turn an untrusted redirect target into a same-origin path.
 *
 * A leading slash alone is not enough: both `//example.com` and `/\\example.com`
 * are interpreted as cross-origin URLs by browsers. Resolving against a fixed
 * origin lets the URL parser make that decision instead of duplicating its
 * rules here.
 */
export function safeInternalPath(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const base = "https://baby-steps.invalid";

  try {
    const target = new URL(value, base);
    if (target.origin !== base) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
