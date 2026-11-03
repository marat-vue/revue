<script setup lang="ts">
import { PlayIcon } from "lucide-vue-next";
import type { ExampleBlock } from "~/utils/sandbox-shared";

const props = defineProps<{ blocks: ExampleBlock[] }>();
const LANG_LABELS: Record<string, string> = { javascript: "js", typescript: "ts" };

const running = ref(false);
const online = useOnline();
const langs = computed(() => [...new Set(props.blocks.map((b) => LANG_LABELS[b.lang] ?? b.lang))].join(" + "));
const title = () => document.querySelector("h1")?.textContent?.trim();
</script>

<template>
  <div class="not-prose overflow-hidden rounded-[var(--radius)] border bg-card">
    <!-- редактор и бандлер грузятся отдельным чанком только после нажатия «Запустить» -->
    <LazyLiveExampleRunner v-if="running" :blocks="blocks" :title="title()" @close="running = false" />
    <button
      v-else
      type="button"
      :disabled="!online"
      class="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-60"
      @click="running = true"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background transition-transform group-hover:scale-105">
        <PlayIcon class="size-3.5 translate-x-px" fill="currentColor" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium">{{ online ? "Запустить пример" : "Пример запустится при подключении к интернету" }}</span>
        <span class="label mt-0.5 block tracking-normal normal-case">
          {{ langs }} · {{ online ? "код можно менять, результат обновится сразу" : "код собирается на серверах CodeSandbox" }}
        </span>
      </span>
    </button>
  </div>
</template>
