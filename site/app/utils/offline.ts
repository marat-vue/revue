
/**
 * Кеши офлайн-режима. Имена совпадают с runtimeCaching в scripts/build-sw.mjs:
 * service worker кладёт сюда открытые страницы, а «Скачать для офлайна» — разделы целиком.
 */
export const PAGES_CACHE = "redev-pages";
/** Данные клиентских переходов Nuxt (_payload.json). */
export const PAYLOAD_CACHE = "redev-payload";

/** Примерный вес одной страницы урока в кеше — для оценки перед скачиванием. */
export const PAGE_SIZE_ESTIMATE = 140 * 1024;

export const offlineSupported = () => typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator;

/** URL страницы в кеше — так же, как его запрашивает браузер при переходе. */
// Базовый путь захватывается компонентом до await, пока доступен Nuxt context.
export const pageUrl = (href: string, base = "") => new URL(`${base.replace(/\/+$/, "")}${href}`, location.origin).href;

/** Какие страницы (href без basePath) уже лежат в кеше. */
export async function cachedHrefs(base = ""): Promise<Set<string>> {
  if (!offlineSupported()) return new Set();
  const [pages, payloads] = await Promise.all([caches.open(PAGES_CACHE), caches.open(PAYLOAD_CACHE)]);
  const [keys, payloadKeys] = await Promise.all([pages.keys(), payloads.keys()]);
  const prefix = `${base.replace(/\/+$/, "")}/`;
  const havePayload = new Set(payloadKeys.map((r) => new URL(r.url).pathname));
  return new Set(keys.flatMap((r) => {
    const pathname = new URL(r.url).pathname;
    return pathname.startsWith(prefix) && havePayload.has(`${pathname}_payload.json`) ? [pathname.slice(prefix.length - 1)] : [];
  }));
}

/**
 * Скачивает страницы в кеш с ограниченной параллельностью.
 * Уже сохранённые пропускаются; onProgress получает число обработанных страниц.
 */
export async function downloadPages(
  hrefs: string[],
  { base = "", signal, onProgress, concurrency = 6 }: { base?: string; signal?: AbortSignal; onProgress?: (done: number) => void; concurrency?: number } = {},
) {
  const cache = await caches.open(PAGES_CACHE);
  const payloads = await caches.open(PAYLOAD_CACHE);
  const have = await cachedHrefs(base);
  const uniqueHrefs = [...new Set(hrefs)];
  const queue = uniqueHrefs.filter((h) => !have.has(h));
  let done = uniqueHrefs.length - queue.length;
  let failed = 0;
  onProgress?.(done);

  async function worker() {
    while (queue.length && !signal?.aborted) {
      const href = queue.shift()!;
      try {
        // HTML — для открытия страницы, _payload.json — для перехода на неё внутри сайта без перезагрузки
        const [res, payload] = await Promise.all([
          fetch(pageUrl(href, base), { signal, credentials: "same-origin" }),
          fetch(pageUrl(`${href}_payload.json`, base), { signal, credentials: "same-origin" }),
        ]);
        if (!res.ok || !payload.ok || !payload.headers.get("content-type")?.includes("json")) throw new Error("Incomplete offline page");
        await payloads.put(pageUrl(`${href}_payload.json`, base), payload);
        await cache.put(pageUrl(href, base), res);
      } catch (e) {
        if (signal?.aborted) return;
        failed++;
        void e;
      }
      onProgress?.(++done);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(16, Math.floor(concurrency) || 1)) }, worker));
  return { failed };
}

export async function clearOfflinePages() {
  await Promise.all([caches.delete(PAGES_CACHE), caches.delete(PAYLOAD_CACHE)]);
}

/** Просим браузер не вытеснять кеш при нехватке места (без этого он может удалить офлайн-данные). */
export async function requestPersistentStorage() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  try {
    return (await navigator.storage?.estimate?.()) ?? null;
  } catch {
    return null;
  }
}

/* ───────────── сеть ───────────── */

/** true, пока браузер считает, что сеть есть. На сервере и до гидрации — всегда true. */
export function useOnline() {
  const online = ref(true);
  if (import.meta.client) {
    const update = () => (online.value = navigator.onLine);
    onMounted(() => {
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    });
  }
  return online;
}
