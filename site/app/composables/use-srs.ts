import type { MaybeRefOrGetter } from "vue";
import { State } from "~/utils/srs";
import { useAppStore } from "~/stores/app";

/** Текущее время, обновляемое раз в минуту — для пересчёта «к повторению». */
export function useNow(intervalMs = 60_000) {
  const now = ref(Date.now());
  let t: ReturnType<typeof setInterval> | undefined;
  onMounted(() => (t = setInterval(() => (now.value = Date.now()), intervalMs)));
  onBeforeUnmount(() => clearInterval(t));
  return now;
}

/** Сколько карточек ждёт сегодня: просроченные + доступные новые. */
export function useDueSummary(scope?: MaybeRefOrGetter<Set<string> | null | undefined>) {
  const store = useAppStore();
  const now = useNow();
  return computed(() => {
    const s = toValue(scope);
    let review = 0;
    let learning = 0;
    let fresh = 0;
    for (const [id, c] of Object.entries(store.srs.cards)) {
      if (s && !s.has(id)) continue;
      if (c.state === State.New) fresh++;
      else if (c.due <= now.value) {
        if (c.state === State.Review) review++;
        else learning++;
      }
    }
    const newToday = Math.min(fresh, store.newLeftToday(now.value));
    return { review, learning, fresh, newToday, total: review + learning + newToday };
  });
}

/** Сколько уроков из списка изучено. */
export function useCompletion(ids: MaybeRefOrGetter<string[]>) {
  const store = useAppStore();
  return computed(() => {
    const list = toValue(ids);
    let done = 0;
    for (const id of list) if (store.progress.lessons[id]?.c) done++;
    return { done, total: list.length, pct: list.length ? done / list.length : 0 };
  });
}

export const OPEN_SEARCH_EVENT = "refront:open-search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
