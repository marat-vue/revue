import { State } from "ts-fsrs";
import type { StoredCard } from "./srs";

export const LEARN_AHEAD = 20 * 60_000;

/** Просроченные и изучаемые карточки чередуются с разрешённым числом новых. */
export function buildReviewQueue(entries: [string, StoredCard][], now: number, newLimit: number) {
  const due = entries
    .filter(([, c]) => c.state !== State.New && c.due <= now + (c.state === State.Review ? 0 : LEARN_AHEAD))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
  const fresh = entries
    .filter(([, c]) => c.state === State.New)
    .sort((a, b) => a[1].addedAt - b[1].addedAt)
    .slice(0, Math.max(0, newLimit))
    .map(([id]) => id);
  if (!fresh.length) return due;
  if (!due.length) return fresh;
  const out: string[] = [];
  const step = Math.max(1, Math.round(due.length / fresh.length));
  let f = 0;
  due.forEach((id, i) => {
    out.push(id);
    if ((i + 1) % step === 0 && f < fresh.length) out.push(fresh[f++]);
  });
  return out.concat(fresh.slice(f));
}
