import assert from "node:assert/strict";
import test from "node:test";
import { parsePersistedState } from "../shared/utils/persistence.ts";

const backup = () => ({
  app: "redev", version: 1,
  progress: { lessons: { lesson: { v: 100, c: 200 } }, last: { id: "lesson", title: "Урок", href: "/l/04/01/03/", at: 200 } },
  srs: { cards: { lesson: { due: 300, stability: 0, difficulty: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_review: null, addedAt: 100 } }, days: { "2026-11-03": { r: 1, a: 0, n: 1 } } },
  settings: { retention: 0.9, newPerDay: 15, maxInterval: 365, fuzz: true, autoAdd: true },
});

test("existing exports retain progress, FSRS cards and settings", () => {
  const data = backup();
  assert.deepEqual(parsePersistedState(JSON.parse(JSON.stringify(data))), data);
});

test("partial backups use the store defaults for missing sections", () => {
  assert.deepEqual(parsePersistedState({ progress: { lessons: {} } }), { progress: { lessons: {} } });
  assert.deepEqual(parsePersistedState({ srs: {} }), { srs: {} });
});

test("reject malformed nested state before importing it", () => {
  for (const data of [null, [], {}, { progress: null }, { srs: { cards: null } }, { progress: { lessons: [] } }, { srs: { days: { today: { r: "1", a: 0, n: 0 } } } }]) {
    assert.throws(() => parsePersistedState(data));
  }
});

test("reject invalid scheduler parameters and card dates", () => {
  for (const patch of [{ retention: 1 }, { retention: -1 }, { retention: NaN }, { newPerDay: -1 }, { newPerDay: 0.5 }, { maxInterval: 0 }, { fuzz: "yes" }]) {
    const data = backup();
    Object.assign(data.settings, patch);
    assert.throws(() => parsePersistedState(data));
  }
  for (const patch of [{ due: Infinity }, { last_review: "yesterday" }, { state: 4 }, { reps: -1 }, { stability: "1" }]) {
    const data = backup();
    Object.assign(data.srs.cards.lesson, patch);
    assert.throws(() => parsePersistedState(data));
  }
});

test("last-read links must point to a lesson in the app", () => {
  for (const href of ["javascript:alert(1)", "//example.com", "/l/../settings/", "https://example.com/l/01/"]) {
    const data = backup();
    data.progress.last.href = href;
    assert.throws(() => parsePersistedState(data));
  }
});
