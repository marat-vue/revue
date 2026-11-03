<script setup lang="ts">
import { createSandpack, SANDPACK_KEY } from "./sandpack";
import { templateEnvironment, type Starter } from "./starters";

/** Рабочая область проекта: файлы, редактор, превью или тесты, консоль. Пересоздаётся при смене проекта. */
const props = defineProps<{ project: Starter; view: "code" | "split" | "preview"; showFiles: boolean; showConsole: boolean }>();
const emit = defineEmits<{ change: [state: { files: Record<string, string>; activeFile: string }] }>();

const sp = createSandpack({
  files: props.project.files,
  environment: templateEnvironment(props.project.template),
  activeFile: props.project.activeFile,
  visibleFiles: props.project.visibleFiles ?? [props.project.activeFile],
  recompileDelay: 500,
});
provide(SANDPACK_KEY, sp);

watch(
  () => [{ ...sp.files }, sp.activeFile.value] as const,
  ([files, activeFile]) => emit("change", { files, activeFile }),
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
    <aside v-if="showFiles && view !== 'preview'" class="h-40 shrink-0 overflow-hidden border-b md:h-auto md:w-56 md:border-r md:border-b-0">
      <SandboxFilePanel />
    </aside>

    <div :class="cn('min-h-64 min-w-0 flex-1 overflow-hidden md:min-h-0', view === 'preview' && 'hidden')">
      <SandpackCodeEditor closable-tabs />
    </div>

    <div
      :class="
        cn(
          'flex min-h-72 min-w-0 flex-1 flex-col overflow-hidden border-t md:min-h-0 md:border-t-0 md:border-l',
          showConsole && 'min-h-[26rem] md:min-h-0',
          view === 'code' && 'hidden',
          view === 'preview' && 'border-0 md:border-0',
        )
      "
    >
      <!-- тесты в стиле Jest выполняются прямо в браузере; watch-режим перезапускает их при правках -->
      <SandpackTests v-if="project.mode === 'tests'" class="min-h-0 flex-1" watch-mode verbose />
      <SandpackPreview v-else :show-navigator="view === 'preview'" />
      <div v-if="showConsole" class="h-36 shrink-0 border-t md:h-48">
        <SandpackConsole show-header />
      </div>
    </div>
  </div>
</template>
