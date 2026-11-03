import { defineStore } from "pinia";
import { DEFAULT_SRS, newStoredCard, Rating, State, type SrsSettings, type StoredCard } from "~/utils/srs";
import { parsePersistedState } from "#shared/utils/persistence";

/* ─────────────────────────── типы состояния ─────────────────────────── */

export interface LessonProgress {
  /** когда впервые открыт */
  v?: number;
  /** когда отмечен изученным */
  c?: number;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  last: { id: string; href: string; title: string; at: number } | null;
}

export interface DayStat {
  /** повторений */
  r: number;
  /** из них «Снова» */
  a: number;
  /** новых карточек введено */
  n: number;
}

export interface SrsState {
  cards: Record<string, StoredCard>;
  days: Record<string, DayStat>;
}

export interface SettingsState extends SrsSettings {
  autoAdd: boolean;
}

export interface PersistedState {
  progress: ProgressState;
  srs: SrsState;
  settings: SettingsState;
}

// ключ оставлен прежним, чтобы не потерять уже сохранённый прогресс
export const STORAGE_KEY = "konspekt:v1";

const initialSettings = (): SettingsState => ({ ...DEFAULT_SRS, autoAdd: true });
const initialSrs = (): SrsState => ({ cards: {}, days: {} });
const initialProgress = (): ProgressState => ({ lessons: {}, last: null });

export interface AnswerPayload {
  id: string;
  card: StoredCard;
  rating: number;
  wasNew: boolean;
  at: number;
}

/**
 * Состояние живёт только в браузере: на сервере и при гидрации — пустое (hydrated = false),
 * после монтирования плагин persist.client.ts читает localStorage и сохраняет изменения обратно.
 */
export const useAppStore = defineStore("app", {
  state: () => ({
    hydrated: false,
    settings: initialSettings(),
    srs: initialSrs(),
    progress: initialProgress(),
  }),

  getters: {
    persisted: (s): PersistedState => ({ progress: s.progress, srs: s.srs, settings: s.settings }),
  },

  actions: {
    hydrate(value: unknown) {
      const data = value === null ? null : parsePersistedState(value);
      this.settings = { ...initialSettings(), ...(data?.settings ?? {}) };
      this.srs = { ...initialSrs(), ...(data?.srs ?? {}) };
      this.progress = { ...initialProgress(), ...(data?.progress ?? {}) };
      this.hydrated = true;
    },
    resetAll() {
      this.settings = initialSettings();
      this.srs = initialSrs();
      this.progress = initialProgress();
    },
    updateSettings(patch: Partial<SettingsState>) {
      this.settings = { ...this.settings, ...patch };
    },
    /** Время передаётся явно, чтобы лимит обновлялся и после полуночи. */
    newLeftToday(at = Date.now()) {
      return Math.max(0, this.settings.newPerDay - (this.srs.days[dayKey(at)]?.n ?? 0));
    },

    /* ── srs ── */
    addCards(ids: string[]) {
      const now = Date.now();
      for (const id of ids) if (!this.srs.cards[id]) this.srs.cards[id] = newStoredCard(now);
    },
    removeCards(ids: string[]) {
      for (const id of ids) delete this.srs.cards[id];
    },
    /** Результат ответа уже посчитан FSRS снаружи. */
    answer({ id, card, rating, wasNew, at }: AnswerPayload) {
      this.srs.cards[id] = card;
      this.bumpDay(dayKey(at), { r: 1, a: rating === Rating.Again ? 1 : 0, n: wasNew ? 1 : 0 });
    },
    undoAnswer({ id, card, rating, wasNew, at }: AnswerPayload) {
      this.srs.cards[id] = card;
      this.bumpDay(dayKey(at), { r: -1, a: rating === Rating.Again ? -1 : 0, n: wasNew ? -1 : 0 });
    },
    resetCards(ids: string[]) {
      const now = Date.now();
      for (const id of ids) {
        const prev = this.srs.cards[id];
        if (prev) this.srs.cards[id] = { ...newStoredCard(now), addedAt: prev.addedAt };
      }
    },
    bumpDay(key: string, delta: Partial<DayStat>) {
      const d = (this.srs.days[key] ??= { r: 0, a: 0, n: 0 });
      d.r = Math.max(0, d.r + (delta.r ?? 0));
      d.a = Math.max(0, d.a + (delta.a ?? 0));
      d.n = Math.max(0, d.n + (delta.n ?? 0));
    },

    /* ── progress ── */
    visit(payload: { id: string; href: string; title: string }) {
      const now = Date.now();
      const p = (this.progress.lessons[payload.id] ??= {});
      p.v ??= now;
      this.progress.last = { ...payload, at: now };
    },
    setCompleted(ids: string[], value: boolean) {
      const now = Date.now();
      for (const id of ids) {
        const p = (this.progress.lessons[id] ??= {});
        if (value) {
          p.c ??= now;
          p.v ??= now;
        } else delete p.c;
      }
    },
  },
});

export function isNewCard(c: StoredCard) {
  return c.state === State.New;
}
