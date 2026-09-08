// Run with `npm test`. See lib/changes.test.ts for why this imports a real
// ".ts" path and never a "@/" alias.
//
// `whileTokenSettles` is worth a test for the reason `applyChange` is: it
// encodes a rule about *which* failures are allowed to be retried, and the
// whole value of it is that the rule stays narrow. A retry that quietly widens
// to cover real errors turns a broken query into a slow broken query — so the
// test that matters most here is the one asserting an ordinary failure is
// returned untouched, on the first attempt.
import assert from "node:assert/strict";
import { test } from "node:test";

import { BACKOFF_MS, whileTokenSettles } from "./settling.ts";

/** The real retry budget, with the waiting taken out. */
const NOW = BACKOFF_MS.map(() => 0);

/** A query that fails with `message` for its first `failures` attempts. */
function flaky(message: string, failures: number) {
  let attempts = 0;
  return {
    get attempts() {
      return attempts;
    },
    run: async () => {
      attempts += 1;
      return attempts <= failures
        ? { data: null, error: { message } }
        : { data: ["ok"], error: null };
    },
  };
}

test("a query that succeeds is asked exactly once", async () => {
  const q = flaky("unused", 0);
  const result = await whileTokenSettles(q.run, NOW);
  assert.deepEqual(result.data, ["ok"]);
  assert.equal(q.attempts, 1);
});

test("a token one second ahead of its verifier is retried until it settles", async () => {
  const q = flaky("JWT issued at future", 1);
  const result = await whileTokenSettles(q.run, NOW);
  assert.deepEqual(result.data, ["ok"]);
  assert.equal(result.error, null);
  assert.equal(q.attempts, 2);
});

test("PostgREST's other spelling of the same error is matched too", async () => {
  const q = flaky("JWTIssuedAtFuture", BACKOFF_MS.length);
  const result = await whileTokenSettles(q.run, NOW);
  assert.deepEqual(result.data, ["ok"]);
  assert.equal(q.attempts, BACKOFF_MS.length + 1);
});

test("an ordinary failure is returned as-is, without a second attempt", async () => {
  const q = flaky('relation "day_activities" does not exist', 99);
  const result = await whileTokenSettles(q.run, NOW);
  assert.equal(result.error?.message, 'relation "day_activities" does not exist');
  assert.equal(q.attempts, 1);
});

test("an expired token is not treated as transient — refreshing it is proxy.ts's job", async () => {
  const q = flaky("JWT expired", 99);
  const result = await whileTokenSettles(q.run, NOW);
  assert.equal(result.error?.message, "JWT expired");
  assert.equal(q.attempts, 1);
});

test("skew that outlasts the backoff gives up and reports the real error", async () => {
  const q = flaky("JWT issued at future", 99);
  const result = await whileTokenSettles(q.run, NOW);
  assert.equal(result.error?.message, "JWT issued at future");
  // One first attempt plus one per backoff step, and no more.
  assert.equal(q.attempts, BACKOFF_MS.length + 1);
});
