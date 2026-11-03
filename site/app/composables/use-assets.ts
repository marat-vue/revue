import type { CardContent, IndexEntry } from "#shared/types/content";

/** Базовый путь сайта без слеша на конце: "" или "/redev". */
export function useBasePath() {
  return useRuntimeConfig().app.baseURL.replace(/\/+$/, "");
}

const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    const base = useRuntimeConfig().app.baseURL.replace(/\/+$/, "");
    p = fetch(`${base}${path}`).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p as Promise<T>;
}

/** JSON из public-файла, загружается в браузере, когда enabled становится true. */
function useJsonState<T>(path: string, enabled: () => boolean = () => true) {
  const data = shallowRef<T | null>(null);
  const error = ref(false);
  const attempt = ref(0);
  if (import.meta.client) {
    watch(
      [enabled, attempt],
      ([on], _old, onCleanup) => {
        if (!on) return;
        let alive = true;
        onCleanup(() => (alive = false));
        fetchJson<T>(path)
          .then((d) => {
            if (!alive) return;
            data.value = d;
            error.value = false;
          })
          .catch(() => alive && (error.value = true));
      },
      { immediate: true },
    );
  }
  const retry = () => {
    error.value = false;
    attempt.value++;
  };
  return { data, error, retry };
}

export const useSearchIndex = (enabled?: () => boolean) => useJsonState<IndexEntry[]>("/search-index.json", enabled).data;
/** Карточки грузятся только когда нужны (enabled) — файл почти мегабайт. */
export const useCards = (enabled?: () => boolean) => useJsonState<CardContent[]>("/cards.json", enabled);
