<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon, RotateCwIcon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";

/** Превью: iframe с клиентом бандлера CodeSandbox. showNavigator — адресная строка, как в браузере. */
defineProps<{ showNavigator?: boolean }>();

const sp = useSandpack();
const frame = ref<HTMLIFrameElement | null>(null);
const id = `preview-${Math.random().toString(36).slice(2)}`;
const loading = ref(true);
const url = ref("/");
const nav = ref({ back: false, forward: false });

let off: (() => void) | undefined;

onMounted(() => {
  off = sp.listen((msg) => {
    if (msg.type === "start") loading.value = true;
    if (msg.type === "done") loading.value = false;
    if (msg.type === "urlchange") {
      try {
        url.value = new URL(String(msg.url)).pathname || "/";
      } catch {
        url.value = "/";
      }
      nav.value = { back: Boolean(msg.back), forward: Boolean(msg.forward) };
    }
  }, id);
  if (frame.value) sp.register(frame.value, id);
});
onBeforeUnmount(() => {
  off?.();
  sp.unregister(id);
});

const refresh = () => sp.dispatch({ type: "refresh" }, id);
const back = () => sp.dispatch({ type: "urlback" }, id);
const forward = () => sp.dispatch({ type: "urlforward" }, id);
const go = () => {
  const client = sp.client(id);
  const base = client?.iframe.src ? new URL(client.iframe.src).origin : "";
  if (base) sp.dispatch({ type: "urlchange", url: `${base}${url.value.startsWith("/") ? url.value : `/${url.value}`}` } as never, id);
};
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div v-if="showNavigator" class="flex h-10 shrink-0 items-center gap-1 border-b px-1.5">
      <SandboxIconButton label="Назад" :disabled="!nav.back" @click="back"><ArrowLeftIcon class="size-3.5" /></SandboxIconButton>
      <SandboxIconButton label="Вперёд" :disabled="!nav.forward" @click="forward"><ArrowRightIcon class="size-3.5" /></SandboxIconButton>
      <SandboxIconButton label="Обновить" @click="refresh"><RotateCwIcon class="size-3.5" /></SandboxIconButton>
      <form class="min-w-0 flex-1" @submit.prevent="go">
        <input v-model="url" aria-label="Адрес страницы в превью" class="h-7 w-full rounded-md border bg-muted/40 px-2 font-mono text-[12px] outline-none focus:border-foreground/40" />
      </form>
    </div>
    <div class="relative min-h-0 flex-1 bg-white">
      <iframe ref="frame" title="Превью" class="absolute inset-0 size-full border-0" allow="clipboard-read; clipboard-write; fullscreen" />
      <div v-if="loading || sp.status.value === 'timeout'" class="absolute inset-0 grid place-items-center bg-background">
        <span v-if="sp.status.value === 'timeout'" class="label px-6 text-center">Бандлер не ответил. Проверьте подключение и обновите превью.</span>
        <LoaderIcon v-else class="size-5 animate-spin text-muted-foreground" />
      </div>
      <button
        v-if="!showNavigator"
        type="button"
        title="Обновить превью"
        aria-label="Обновить превью"
        class="absolute right-2 bottom-2 grid size-8 place-items-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        @click="refresh"
      >
        <RotateCwIcon class="size-3.5" />
      </button>
    </div>
  </div>
</template>
