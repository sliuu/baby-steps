/**
 * Retry for "JWT issued at future" only: Auth and PostgREST clocks drift, so a
 * fresh sign-in token can be briefly early. Deliberately narrow; expired tokens
 * are proxy.ts's job and must not be retried.
 */

/** PostgREST error fields safe for server logs. */
export type QueryError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

/** Settling errors only. PostgREST spells it both spaced and camel-cased. */
const SETTLING = /jwt\s*issued\s*at\s*future|jwtissuedatfuture|not\s*yet\s*valid|jws.*nbf/i;

/**
 * Waits before each retry (also the count). ~6s total; [350, 900] proved too
 * short in prod. Free on the happy path. Exported for the test.
 */
export const BACKOFF_MS = [350, 900, 1800, 3000];

/**
 * Run a query, retrying while the token settles. Takes a thunk: a Postgrest
 * builder caches its result, so it must be rebuilt to resend.
 */
export async function whileTokenSettles<T>(
  run: () => PromiseLike<QueryResult<T>>,
  // Overridable only for tests.
  waits: readonly number[] = BACKOFF_MS,
): Promise<QueryResult<T>> {
  let result = await run();

  for (const wait of waits) {
    if (!result.error || !SETTLING.test(result.error.message)) return result;
    await new Promise((resolve) => setTimeout(resolve, wait));
    result = await run();
  }

  return result;
}

/**
 * Still unsettled after all waits. Only a fresh request fixes it, so views
 * catch this (see SettlingRetry.tsx). A class: `instanceof` works server-side.
 */
export class TokenSettlingError extends Error {
  name = "TokenSettlingError";
}

/** `TokenSettlingError` for the timing family, else `Error`; `<what>: <message>`. */
export function queryFailure(what: string, error: QueryError | null): Error {
  const message = `${what}: ${error?.message ?? "no rows returned"}`;
  return error && SETTLING.test(error.message)
    ? new TokenSettlingError(message)
    : new Error(message);
}
