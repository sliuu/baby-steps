/**
 * Retrying the one query failure that fixes itself.
 *
 * Signing in occasionally lands on a runtime error — "Could not load your
 * stickers: JWT issued at future" — that a reload clears. Nothing is wrong with
 * the session, and nothing is wrong with the clock on the machine running this.
 *
 * The reason is that two different Supabase services handle the token a few
 * milliseconds apart. Auth mints the access token and stamps `iat` from its own
 * clock; PostgREST verifies it against *its* clock, and rejects any token that
 * claims to have been issued in the future. `iat` is a whole number of seconds,
 * so it does not take much drift between the two machines to round the wrong
 * way — a few hundred milliseconds is enough to make `iat` land one second
 * ahead. The window this happens in is the moment right after `exchangeCodeForSession`,
 * which is exactly when the callback redirects to `/` and this page queries.
 * That is why it only ever happens on sign-in, and why it is gone by the time
 * you have reloaded.
 *
 * There is no knob for this. PostgREST's allowed clock skew is not exposed to
 * projects, and the token is already minted by the time any code here runs. The
 * one thing that does work is waiting: the token becomes valid on its own, at
 * the latest when the verifier's clock passes `iat`. So this waits and asks
 * again, four times, and only for this.
 *
 * Deliberately not a general-purpose retry. A retry that swallows *any* failure
 * turns a real broken query into a slow real broken query, and hides the
 * breakage while it does it. The match below is narrow on purpose: it is the
 * timing family and nothing else. An expired token is excluded specifically,
 * even though it looks adjacent — that one is not transient and must not be
 * papered over, it is `proxy.ts`'s job to refresh, and retrying it would mask a
 * broken refresh as a slow page.
 */

/** The error fields PostgREST returns and that are safe to put in server logs. */
export type QueryError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

/** The shape every `supabase.from(...).select(...)` settles to. */
type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

/**
 * Errors that mean "ask again in a moment", and only those.
 *
 * PostgREST words this differently depending on version — the Haskell JWT
 * library's constructor is `JWTIssuedAtFuture`, and it reaches the wire both as
 * that and as the spaced-out "JWT issued at future" — so both spellings are
 * matched rather than the one seen most recently.
 */
const SETTLING = /jwt\s*issued\s*at\s*future|jwtissuedatfuture|not\s*yet\s*valid|jws.*nbf/i;

/**
 * How long to wait before each retry, and so also how many there are: one
 * attempt up front plus one per entry here. Exported so the test can mirror the
 * real retry budget at zero delay rather than hardcoding a count beside it —
 * change this array and the test still asserts the right number of attempts.
 *
 * **It was `[350, 900]` and that was too short.** A sign-in on the deployed site
 * hung and then failed with `Could not load notes: JWT issued at future`, which
 * is this exact error arriving *after* the retries had run — so the drift was
 * wider than the 1.25s of waiting the pair allowed for. The note above reasons
 * from `iat` rounding, where a few hundred milliseconds of drift is enough to
 * put the stamp one second ahead; what that reasoning missed is that the
 * underlying clocks can be further apart than the rounding, and then the token
 * is several seconds early rather than one.
 *
 * Six seconds of total waiting, then. The ceiling is a judgement rather than a
 * measurement — the log line says the drift is over 1.25s and doesn't say how
 * far over — and six is where two managed services being out of step stops being
 * a race to absorb and starts being an infrastructure fault that should surface
 * rather than be papered over.
 *
 * **Widening this is close to free, which is the reason it can be this
 * generous.** The loop returns the moment an error isn't a settling one, and a
 * successful query never enters it at all, so none of these waits are on the
 * path that works. They only lengthen the path that currently ends in a broken
 * page — and that path ends inside a `<Suspense>` boundary showing a skeleton,
 * so the trade is a few more seconds of skeleton against a page that loads.
 */
export const BACKOFF_MS = [350, 900, 1800, 3000];

/**
 * Run a query, and give a token that is a second ahead of its verifier the
 * chance to become valid before reporting failure.
 *
 * Takes a thunk rather than a promise because a query has to be *rebuilt* to be
 * re-sent. A `PostgrestFilterBuilder` is thenable and caches its result once
 * awaited, so handing this an already-started query would retry by returning
 * the same failure three times a second and a quarter apart.
 */
export async function whileTokenSettles<T>(
  run: () => PromiseLike<QueryResult<T>>,
  // The waits, overridable only so the test can pass zeros and stay instant.
  // Every caller in the app takes the default; a caller that tunes this is
  // almost certainly reaching for a general-purpose retry, which this is not.
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
 * The settling error, still unsettled after every wait above.
 *
 * **Waiting inside the request turned out not to be enough.** Twice a sign-in
 * on the deployed site has outlasted the full budget — `Could not load notes`,
 * then `Could not load moods: JWT issued at future` — and both times the
 * queries that ran *beside* the failing one, with the same token and the same
 * retry schedule, had succeeded. So it is not one clock that a few more seconds
 * would catch up with; some verifiers accept the token while another keeps
 * refusing it. What has always worked is a fresh request: a reload, or the
 * error page's "Try again". The views catch this class and do that for you —
 * see `components/views/SettlingRetry.tsx`.
 *
 * A class rather than a message match because the views run on the server,
 * where `instanceof` holds; the message only reaches the browser as a digest.
 */
export class TokenSettlingError extends Error {
  name = "TokenSettlingError";
}

/**
 * The error a failed query throws: `TokenSettlingError` for the timing family,
 * a plain `Error` for everything else, worded `<what>: <PostgREST message>` so
 * the server log line stays greppable.
 */
export function queryFailure(what: string, error: QueryError | null): Error {
  const message = `${what}: ${error?.message ?? "no rows returned"}`;
  return error && SETTLING.test(error.message)
    ? new TokenSettlingError(message)
    : new Error(message);
}
