import { STORAGE_KEY, useAppStore, type PersistedState } from "~/stores/app";
import { parsePersistedState } from "#shared/utils/persistence";
import { toast } from "vue-sonner";

function load(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parsePersistedState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Прогресс хранится в localStorage. Читаем его после гидрации (чтобы разметка совпала
 * со статическим HTML) и сохраняем обратно при каждом изменении с небольшой задержкой.
 */
export default defineNuxtPlugin(() => {
  const store = useAppStore();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let applying = false;

  const save = () => {
    timer = undefined;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.persisted));
    } catch {
      toast.error("Не удалось сохранить прогресс", {
        id: "progress-save-error",
        description: "Хранилище браузера недоступно или переполнено. Экспортируйте резервную копию в настройках.",
      });
    }
  };

  onNuxtReady(() => {
    applying = true;
    store.hydrate(load());
    applying = false;

    watch(
      () => store.persisted,
      () => {
        if (applying) return;
        clearTimeout(timer);
        timer = setTimeout(save, 250);
      },
      { deep: true },
    );

    // синхронизация между вкладками
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      applying = true;
      store.hydrate(load());
      nextTick(() => (applying = false));
    });
    window.addEventListener("pagehide", () => {
      if (timer) {
        clearTimeout(timer);
        save();
      }
    });
  });
});
