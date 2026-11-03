import assert from "node:assert/strict";
import test from "node:test";
import { State } from "ts-fsrs";
import { buildReviewQueue, LEARN_AHEAD } from "../app/utils/review-queue.ts";

const card = (state, due, addedAt = 0) => ({ state, due, addedAt });

test("review queue observes new-card limits while preserving due reviews", () => {
  const entries = [["newer", card(State.New, 0, 2)], ["future", card(State.Review, 101)], ["older", card(State.New, 0, 1)], ["due", card(State.Review, 99)]];
  assert.deepEqual(buildReviewQueue(entries, 100, 1), ["due", "older"]);
  assert.deepEqual(buildReviewQueue(entries, 100, 0), ["due"]);
});

test("learning cards can return soon; future review cards stay scheduled", () => {
  const entries = [["learn", card(State.Learning, 100 + LEARN_AHEAD)], ["later", card(State.Learning, 101 + LEARN_AHEAD)], ["review", card(State.Review, 101)]];
  assert.deepEqual(buildReviewQueue(entries, 100, 0), ["learn"]);
});

test("each extra batch contains at most ten new cards", () => {
  let entries = Array.from({ length: 35 }, (_, i) => [String(i), card(State.New, 0, i)]);
  for (const expected of [10, 10, 10, 5]) {
    const batch = buildReviewQueue(entries, 100, 10);
    assert.equal(batch.length, expected);
    entries = entries.filter(([id]) => !batch.includes(id));
  }
});
