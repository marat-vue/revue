<script setup lang="ts">
import { BanIcon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";
import { formatConsoleValue, withoutSyntaxErrors, type ConsoleLog } from "./console-format";

/** Консоль превью: console.log/info/warn/error из iframe. Сбрасывается при перезапуске превью. */
defineProps<{ showHeader?: boolean }>();

const MAX = 800;
const sp = useSandpack();
const logs = shallowRef<ConsoleLog[]>([]);
const list = ref<HTMLDivElement | null>(null);

let off: (() => void) | undefined;
onMounted(() => {
  off = sp.listen((msg) => {
    if (msg.type === "start") {
      logs.value = [];
      return;
    }
    if (msg.type !== "console" || !msg.codesandbox) return;
    const payload = (Array.isArray(msg.log) ? msg.log : [msg.log]) as ConsoleLog[];
    if (payload.some((l) => l.method === "clear")) {
      logs.value = [{ id: "clear", method: "clear", data: ["Console was cleared"] }];
      return;
    }
    const next = [...logs.value, ...withoutSyntaxErrors(payload)];
    logs.value = next.slice(-MAX);
    nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight }));
  });
});
onBeforeUnmount(() => off?.());

const items = computed(() =>
  logs.value.flatMap((log, i) =>
    (Array.isArray(log.data) ? log.data : []).map((value, j) => ({
      key: `${log.id}-${i}-${j}`,
      method: log.method,
      text: log.method === "clear" ? String(value) : formatConsoleValue(value, logs.value.slice(i).map((l) => l.data)),
    })),
  ),
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div v-if="showHeader" class="flex h-9 shrink-0 items-center justify-between border-b pr-1.5 pl-3">
      <span class="label">Консоль</span>
      <SandboxIconButton label="Очистить консоль" @click="logs = []"><BanIcon class="size-3.5" /></SandboxIconButton>
    </div>
    <div ref="list" class="thin-scrollbar min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5">
      <div
        v-for="it in items"
        :key="it.key"
        :class="
          cn(
            'border-b border-line px-3 py-1.5 break-all whitespace-pre-wrap',
            it.method === 'error' ? 'bg-muted/60 text-foreground' : it.method === 'warn' ? 'bg-muted/30 text-foreground' : it.method === 'clear' ? 'text-faint italic' : 'text-muted-foreground',
          )
        "
      >
        {{ it.text }}
      </div>
    </div>
  </div>
</template>
