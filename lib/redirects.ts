/** Untrusted redirect → same-origin path. URL parser catches `//x` and `/\\x`. */
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
