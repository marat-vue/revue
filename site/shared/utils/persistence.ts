import type { PersistedState } from "../../app/stores/app";

type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue => v !== null && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const timestamp = (v: unknown) => number(v) && v <= 8.64e15;
const count = (v: unknown): v is number => number(v) && Number.isSafeInteger(v);
const optional = (o: RecordValue, key: string, valid: (v: unknown) => boolean) => !(key in o) || valid(o[key]);
const dictionary = (v: unknown, valid: (v: unknown) => boolean) => record(v) && Object.values(v).every(valid);

/** Проверяем копию целиком до изменения store: неудачный импорт не должен терять прогресс. */
export function parsePersistedState(value: unknown): Partial<PersistedState> {
  if (!record(value) || !("progress" in value || "srs" in value)) throw new Error("Invalid progress backup");

  const validProgress = (v: unknown) => record(v)
    && optional(v, "lessons", (lessons) => dictionary(lessons, (p) => record(p) && optional(p, "v", timestamp) && optional(p, "c", timestamp)))
    && optional(v, "last", (last) => last === null || (record(last) && typeof last.id === "string"
      && typeof last.title === "string" && typeof last.href === "string" && /^\/l\/(?:[\p{L}\p{N}_-]+\/)+$/u.test(last.href) && timestamp(last.at)));

  const validCard = (v: unknown) => record(v) && timestamp(v.due) && timestamp(v.addedAt)
    && number(v.stability) && number(v.difficulty) && v.difficulty <= 10
    && count(v.scheduled_days) && count(v.learning_steps) && count(v.reps) && count(v.lapses)
    && count(v.state) && v.state <= 3 && (v.last_review === null || timestamp(v.last_review));

  const validSrs = (v: unknown) => record(v) && optional(v, "cards", (cards) => dictionary(cards, validCard))
    && optional(v, "days", (days) => dictionary(days, (d) => record(d) && count(d.r) && count(d.a) && count(d.n)));

  const validSettings = (v: unknown) => record(v)
    && optional(v, "retention", (n) => number(n) && n > 0 && n < 1)
    && optional(v, "newPerDay", count)
    && optional(v, "maxInterval", (n) => count(n) && n > 0)
    && optional(v, "fuzz", (b) => typeof b === "boolean")
    && optional(v, "autoAdd", (b) => typeof b === "boolean");

  if (!optional(value, "progress", validProgress) || !optional(value, "srs", validSrs) || !optional(value, "settings", validSettings)) {
    throw new Error("Invalid progress backup");
  }
  return value as Partial<PersistedState>;
}
