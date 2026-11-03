<script setup lang="ts">
import { toast } from "vue-sonner";
import { CodeIcon, Columns2Icon, ExternalLinkIcon, EyeIcon, FlaskConicalIcon, FolderTreeIcon, RotateCcwIcon, TerminalIcon } from "lucide-vue-next";
import type { Component } from "vue";
import { STARTERS, exampleStarter, templateEnvironment, type ProjectId, type Starter } from "./starters";
import { CURRENT_KEY, PROJECT_KEY, VIEW_KEY, readJSON, removeKey, saveAsLessonProject, writeJSON, type SavedProject } from "./storage";
import { LESSON_SNIPPET_KEY, type LessonSnippet } from "~/utils/sandbox-shared";
import { openInCodeSandbox } from "./open-in-codesandbox";

/* ───────────── загрузка проектов ───────────── */

function loadProject(id: ProjectId): Starter | null {
  const saved = readJSON<SavedProject>(PROJECT_KEY(id));
  const starter = STARTERS.find((s) => s.id === id);
  if (saved?.files && Object.keys(saved.files).length) {
    return {
      id,
      label: saved.label ?? starter?.label ?? "Из урока",
      hint: saved.hint ?? starter?.hint ?? "",
      template: saved.template,
      mode: saved.mode ?? starter?.mode ?? "preview",
      activeFile: saved.activeFile,
      files: saved.files,
    };
  }
  return starter ?? null;
}

/** Код, переданный из урока кнопкой ▶, становится проектом «Из урока». */
function takeLessonSnippet(): Starter | null {
  const snippet = readJSON<LessonSnippet>(LESSON_SNIPPET_KEY);
  if (!snippet?.blocks?.length) return null;
  removeKey(LESSON_SNIPPET_KEY);
  const project = exampleStarter(snippet.blocks, snippet.title);
  saveAsLessonProject({ template: project.template, mode: project.mode, files: project.files, activeFile: project.activeFile, hint: project.hint });
  return project;
}

function initialProject(): Starter {
  const savedId = readJSON<ProjectId>(CURRENT_KEY);
  return takeLessonSnippet() ?? (savedId && loadProject(savedId)) ?? STARTERS[0]!;
}

/* ───────────── вид ───────────── */

type View = "code" | "split" | "preview";

const VIEWS: { id: View; label: string; icon: Component }[] = [
  { id: "code", label: "Код", icon: CodeIcon },
  { id: "split", label: "Код и превью", icon: Columns2Icon },
  { id: "preview", label: "Просмотр", icon: EyeIcon },
];
const TEST_VIEWS: typeof VIEWS = [
  { id: "code", label: "Код", icon: CodeIcon },
  { id: "split", label: "Код и тесты", icon: Columns2Icon },
  { id: "preview", label: "Тесты", icon: FlaskConicalIcon },
];

const online = useOnline();
const mobile = window.matchMedia("(max-width: 767px)").matches;
const project = shallowRef<Starter>(initialProject());
const version = ref(0); // смена ключа пересоздаёт рабочую область
const view = ref<View>(readJSON<View>(VIEW_KEY) ?? (mobile ? "code" : "split"));
const showFiles = ref(!mobile);
const showConsole = ref(false);
const workspace = ref<{ files: Record<string, string>; environment: string } | null>(null);

watch(project, (p) => writeJSON(CURRENT_KEY, p.id), { immediate: true });
watch(view, (v) => writeJSON(VIEW_KEY, v));

const tabs = computed(() => {
  const list = STARTERS.map((s) => ({ id: s.id, label: s.label }));
  const hasLesson = project.value.id === "lesson" || Boolean(readJSON(PROJECT_KEY("lesson")));
  return hasLesson ? [...list, { id: "lesson" as ProjectId, label: "Из урока" }] : list;
});

function switchProject(id: ProjectId) {
  flushSave();
  const next = loadProject(id);
  if (next) project.value = next;
}

function reset() {
  const p = project.value;
  if (p.id === "lesson") {
    if (!confirm("Удалить проект «Из урока»?")) return;
    clearTimeout(saveTimer);
    pendingSave = null;
    removeKey(PROJECT_KEY("lesson"));
    project.value = STARTERS[0]!;
    return;
  }
  if (!confirm(`Вернуть проект «${p.label}» к исходному состоянию? Ваши изменения будут потеряны.`)) return;
  clearTimeout(saveTimer);
  pendingSave = null;
  removeKey(PROJECT_KEY(p.id));
  project.value = STARTERS.find((s) => s.id === p.id)!;
  version.value++;
  toast.success("Проект сброшен");
}

/** Автосохранение: рабочая область сообщает о каждом изменении файлов. */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSave: { id: ProjectId; data: SavedProject } | null = null;
function flushSave() {
  clearTimeout(saveTimer);
  if (pendingSave) writeJSON(PROJECT_KEY(pendingSave.id), pendingSave.data);
  pendingSave = null;
}
function onChange(state: { files: Record<string, string>; activeFile: string }) {
  workspace.value = { files: state.files, environment: templateEnvironment(project.value.template) };
  clearTimeout(saveTimer);
  const p = project.value;
  pendingSave = {
    id: p.id,
    data: {
      template: p.template,
      mode: p.mode,
      files: state.files,
      activeFile: state.activeFile,
      label: p.label,
      hint: p.hint,
    },
  };
  saveTimer = setTimeout(flushSave, 400);
}

onMounted(() => window.addEventListener("pagehide", flushSave));
onBeforeUnmount(() => {
  flushSave();
  window.removeEventListener("pagehide", flushSave);
});

const openExternal = () => {
  const ws = workspace.value;
  openInCodeSandbox(ws?.files ?? project.value.files, templateEnvironment(project.value.template));
};
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-6">
      <div class="no-scrollbar -mx-1 flex w-full min-w-0 items-center gap-1 overflow-x-auto px-1 sm:w-auto sm:flex-1">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          :aria-pressed="project.id === t.id"
          :class="
            cn(
              'inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-[13px] whitespace-nowrap transition-colors',
              project.id === t.id ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )
          "
          @click="switchProject(t.id)"
        >
          {{ t.label }}
        </button>
        <span class="ml-2 hidden truncate text-[12px] text-muted-foreground 2xl:inline">{{ project.hint }}</span>
      </div>

      <div class="flex max-w-full flex-wrap items-center gap-1.5">
        <div class="flex h-11 shrink-0 items-center rounded-md border p-0.5 md:h-8">
          <button
            v-for="it in project.mode === 'tests' ? TEST_VIEWS : VIEWS"
            :key="it.id"
            type="button"
            :aria-pressed="view === it.id"
            :title="it.label"
            :aria-label="it.label"
            :class="
              cn(
                'flex h-full items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] whitespace-nowrap transition-colors',
                view === it.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )
            "
            @click="view = it.id"
          >
            <component :is="it.icon" class="size-3.5" />
            <span class="hidden xl:inline">{{ it.label }}</span>
          </button>
        </div>
        <SandboxIconButton :label="showFiles ? 'Скрыть файлы' : 'Показать файлы'" @click="showFiles = !showFiles">
          <FolderTreeIcon :class="cn('size-4', showFiles && 'text-foreground')" />
        </SandboxIconButton>
        <SandboxIconButton :label="showConsole ? 'Скрыть консоль' : 'Показать консоль'" @click="showConsole = !showConsole">
          <TerminalIcon :class="cn('size-4', showConsole && 'text-foreground')" />
        </SandboxIconButton>
        <SandboxIconButton :label="project.id === 'lesson' ? 'Удалить проект' : 'Сбросить проект'" @click="reset">
          <RotateCcwIcon class="size-4" />
        </SandboxIconButton>
        <SandboxIconButton label="Открыть в CodeSandbox" @click="openExternal"><ExternalLinkIcon class="size-4" /></SandboxIconButton>
      </div>
    </div>

    <div v-if="!online" class="shrink-0 border-b bg-muted/60 px-4 py-2 text-[13px] text-muted-foreground sm:px-6">
      Нет подключения: код собирается на серверах CodeSandbox, поэтому превью и тесты недоступны. Редактировать файлы можно — всё сохранится в
      браузере.
    </div>

    <SandboxWorkspace
      :key="`${project.id}:${version}`"
      :project="project"
      :view="view"
      :show-files="showFiles"
      :show-console="showConsole"
      @change="onChange"
    />
  </div>
</template>
