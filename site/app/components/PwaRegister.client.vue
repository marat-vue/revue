<script setup lang="ts">
import { Workbox } from "workbox-window";
import { toast } from "vue-sonner";
import type { BeforeInstallPromptEvent } from "~/composables/use-install-prompt";

/**
 * Регистрирует service worker (его генерирует Workbox после сборки — scripts/build-sw.mjs),
 * предлагает обновиться до новой версии и сообщает о переходе в офлайн.
 * В dev service worker не нужен: он мешал бы горячей перезагрузке.
 */
const base = useBasePath();

const onInstallPrompt = (e: Event) => {
  e.preventDefault(); // показываем свою кнопку в настройках вместо мини-баннера браузера
  setInstallEvent(e as BeforeInstallPromptEvent);
};
const onInstalled = () => {
  setInstallEvent(null);
  toast.success("Приложение установлено");
};
const onOffline = () => toast("Нет подключения", { description: "Доступны сохранённые уроки, повторение и статистика.", id: "network" });
const onOnline = () => toast("Снова онлайн", { id: "network", duration: 2000 });

onMounted(() => {
  window.addEventListener("beforeinstallprompt", onInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);

  if (!import.meta.dev && "serviceWorker" in navigator) {
    const wb = new Workbox(`${base}/sw.js`, { scope: `${base}/` });

    // новая версия скачана и ждёт — спрашиваем, а не перезагружаем страницу посреди чтения
    wb.addEventListener("waiting", () => {
      toast("Доступна новая версия сайта", {
        id: "sw-update",
        duration: Infinity,
        action: {
          label: "Обновить",
          onClick: () => {
            wb.addEventListener("controlling", () => window.location.reload());
            wb.messageSkipWaiting();
          },
        },
      });
    });

    wb.register().catch(() => {});
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  window.removeEventListener("appinstalled", onInstalled);
  window.removeEventListener("offline", onOffline);
  window.removeEventListener("online", onOnline);
});
</script>

<template>
  <span hidden />
</template>
