<script setup lang="ts">
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { XIcon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";
import { baseExtensions, highlighting, language, setErrorLine } from "./editor-setup";

/** Редактор файлов песочницы: вкладки открытых файлов + CodeMirror 6. */
defineProps<{ closableTabs?: boolean }>();

const sp = useSandpack();
const colorMode = useColorMode();
const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

const theme = new Compartment();
const lang = new Compartment();
/** состояние редактора каждого файла: история отмен и позиция курсора сохраняются при переключении вкладок */
const states = new Map<string, EditorState>();

const mode = () => (colorMode.value === "light" ? "light" : "dark");

function createState(path: string) {
  return EditorState.create({
    doc: sp.files[path] ?? "",
    extensions: [
      baseExtensions(),
      theme.of(highlighting(mode())),
      lang.of(language(path)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) sp.updateFile(path, u.state.doc.toString());
      }),
    ],
  });
}

let current = "";

function show(path: string) {
  if (!view || !path) return;
  if (current) states.set(current, view.state);
  current = path;
  let state = states.get(path);
  // файл мог измениться снаружи (сброс проекта) — тогда создаём состояние заново
  if (!state || state.doc.toString() !== (sp.files[path] ?? "")) state = createState(path);
  states.set(path, state);
  view.setState(state);
  view.dispatch({ effects: theme.reconfigure(highlighting(mode())) });
  applyError();
}

function applyError() {
  if (!view) return;
  const e = sp.errors.value;
  const match = e && e.path && (e.path === sp.activeFile.value || `/${e.path.replace(/^\//, "")}` === sp.activeFile.value);
  view.dispatch({ effects: setErrorLine.of(match ? { line: e!.line, message: e!.message } : null) });
}

onMounted(() => {
  view = new EditorView({ parent: host.value! });
  show(sp.activeFile.value);
});
onBeforeUnmount(() => view?.destroy());

watch(sp.activeFile, (p) => show(p));
watch(
  () => colorMode.value,
  () => view?.dispatch({ effects: theme.reconfigure(highlighting(mode())) }),
);
watch(sp.errors, applyError);
// внешние изменения файла (сброс, переименование) — обновляем документ
watch(
  () => sp.files[sp.activeFile.value],
  (code) => {
    if (!view || code === undefined) return;
    if (view.state.doc.toString() !== code) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
  },
);

const name = (path: string) => path.split("/").pop() ?? path;
/** одинаковые имена файлов в разных папках подписываем папкой */
const label = (path: string) => {
  const n = name(path);
  const same = sp.visibleFiles.value.filter((p) => name(p) === n).length > 1;
  return same ? path.split("/").slice(-2).join("/") : n;
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="no-scrollbar flex h-10 shrink-0 items-stretch overflow-x-auto border-b" role="tablist">
      <div
        v-for="path in sp.visibleFiles.value"
        :key="path"
        role="tab"
        :aria-selected="path === sp.activeFile.value"
        :title="path"
        :class="
          cn(
            'group relative flex shrink-0 cursor-pointer items-center gap-1 px-3 font-mono text-[12px] whitespace-nowrap transition-colors',
            path === sp.activeFile.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )
        "
        @click="sp.activeFile.value = path"
      >
        {{ label(path) }}
        <button
          v-if="closableTabs && sp.visibleFiles.value.length > 1"
          type="button"
          class="grid size-4 place-items-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
          :aria-label="`Закрыть ${path}`"
          @click.stop="sp.closeFile(path)"
        >
          <XIcon class="size-3" />
        </button>
        <span v-if="path === sp.activeFile.value" class="absolute inset-x-2 -bottom-px h-px bg-foreground" />
      </div>
    </div>
    <div ref="host" class="sandbox-editor min-h-0 flex-1 overflow-hidden [&_.cm-editor]:h-full" />
  </div>
</template>
