/* ───────────── установка приложения ───────────── */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Событие beforeinstallprompt, общее для всего приложения (его ловит PwaRegister). */
const installEvent = shallowRef<BeforeInstallPromptEvent | null>(null);

export function setInstallEvent(e: BeforeInstallPromptEvent | null) {
  installEvent.value = e;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Можно ли предложить установку (Chrome/Edge/Android) и запущено ли уже как приложение. */
export function useInstallPrompt() {
  const installed = ref(false);
  onMounted(() => (installed.value = isStandalone()));
  const canInstall = computed(() => installEvent.value !== null);

  const install = async () => {
    const e = installEvent.value;
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    installEvent.value = null;
    return outcome === "accepted";
  };

  return { canInstall, installed, install };
}
