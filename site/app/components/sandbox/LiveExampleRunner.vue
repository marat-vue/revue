<script setup lang="ts">
import { ExternalLinkIcon, RotateCcwIcon, TerminalIcon, XIcon } from "lucide-vue-next";
import type { ExampleBlock } from "~/utils/sandbox-shared";
import { createSandpack, SANDPACK_KEY } from "./sandpack";
import { exampleStarter, templateEnvironment } from "./starters";
import { saveAsLessonProject } from "./storage";

/** Мини-песочница под блоком кода урока: редактор файлов примера + превью (или тесты) + консоль. */
const props = defineProps<{ blocks: ExampleBlock[]; title?: string }>();
const emit = defineEmits<{ close: [] }>();

const project = exampleStarter(props.blocks, props.title);
const sp = createSandpack({
  files: project.files,
  environment: templateEnvironment(project.template),
  activeFile: project.activeFile,
  visibleFiles: project.visibleFiles,
  recompileDelay: 500,
});
provide(SANDPACK_KEY, sp);

const showConsole = ref(props.blocks.some((b) => /console\.(log|info|warn|error|table)/.test(b.code)));

function openInSandbox() {
  saveAsLessonProject({
    template: project.template,
    mode: project.mode,
    files: { ...sp.files },
    activeFile: sp.activeFile.value,
    hint: project.hint,
  });
  navigateTo("/sandbox/");
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex min-h-11 flex-wrap items-center justify-between gap-x-2 border-b pr-1.5 pl-3 md:h-10 md:pl-4">
      <span class="label py-2">{{ project.mode === "tests" ? "Тесты · редактируйте код" : "Живой пример · редактируйте код" }}</span>
      <div class="flex items-center">
        <SandboxIconButton v-if="project.mode === 'preview'" :label="showConsole ? 'Скрыть консоль' : 'Показать консоль'" @click="showConsole = !showConsole">
          <TerminalIcon :class="cn('size-3.5', showConsole && 'text-foreground')" />
        </SandboxIconButton>
        <SandboxIconButton label="Вернуть исходный код" @click="sp.resetAllFiles()"><RotateCcwIcon class="size-3.5" /></SandboxIconButton>
        <SandboxIconButton label="Открыть в песочнице" @click="openInSandbox"><ExternalLinkIcon class="size-3.5" /></SandboxIconButton>
        <SandboxIconButton label="Свернуть" @click="emit('close')"><XIcon class="size-3.5" /></SandboxIconButton>
      </div>
    </div>
    <div class="grid md:h-[400px] md:grid-cols-2">
      <div class="h-[280px] min-h-0 min-w-0 overflow-hidden md:h-auto">
        <SandpackCodeEditor />
      </div>
      <div class="flex h-[320px] min-h-0 min-w-0 flex-col overflow-hidden border-t md:h-auto md:border-t-0 md:border-l">
        <SandpackTests v-if="project.mode === 'tests'" class="min-h-0 flex-1" watch-mode />
        <SandpackPreview v-else />
        <div v-if="showConsole && project.mode === 'preview'" class="h-32 shrink-0 border-t">
          <SandpackConsole />
        </div>
      </div>
    </div>
  </div>
</template>
