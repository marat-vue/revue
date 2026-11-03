<script setup lang="ts">
import { CheckIcon, LoaderIcon, PlayIcon, XIcon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";

/**
 * Тесты в стиле Jest выполняются бандлером CodeSandbox в скрытом iframe.
 * Протокол событий тот же, что у SandpackTests: add_file → describe_start → add_test → test_start/test_end → total_test_end.
 */
const props = withDefaults(defineProps<{ watchMode?: boolean; verbose?: boolean }>(), { watchMode: true, verbose: false });

interface TestError {
  message?: string;
  name?: string;
}
interface Test {
  name: string;
  blocks: string[];
  path: string;
  status: "idle" | "running" | "pass" | "fail";
  errors: TestError[];
  duration?: number;
}
interface Describe {
  name: string;
  tests: Record<string, Test>;
  describes: Record<string, Describe>;
}
interface Spec {
  name: string;
  tests: Record<string, Test>;
  describes: Record<string, Describe>;
  error?: TestError;
}

const sp = useSandpack();
const frame = ref<HTMLIFrameElement | null>(null);
const id = `tests-${Math.random().toString(36).slice(2)}`;
const specs = ref<Record<string, Spec>>({});
const status = ref<"initialising" | "idle" | "running" | "complete">("initialising");
const watching = ref(props.watchMode);
const verbose = ref(props.verbose);
const suiteOnly = ref(false);
const startedAt = ref(0);
const duration = ref(0);

const TEST_FILE = /.*\.(test|spec)\.[tj]sx?$/;
const isSpecOpen = computed(() => TEST_FILE.test(sp.activeFile.value));

function runAll() {
  status.value = "running";
  specs.value = {};
  startedAt.value = Date.now();
  sp.dispatch({ type: "run-all-tests" } as never, id);
}
function runSpec() {
  status.value = "running";
  specs.value = {};
  startedAt.value = Date.now();
  sp.dispatch({ type: "run-tests", path: sp.activeFile.value } as never, id);
}
const run = () => (suiteOnly.value && isSpecOpen.value ? runSpec() : runAll());

/** Место в дереве: spec → describes → … → describe. Создаёт недостающие узлы. */
function container(path: string, blocks: string[]): { tests: Record<string, Test>; describes: Record<string, Describe> } {
  const spec = (specs.value[path] ??= { name: path, tests: {}, describes: {} });
  let node: { tests: Record<string, Test>; describes: Record<string, Describe> } = spec;
  for (const b of blocks) node = node.describes[b] ??= { name: b, tests: {}, describes: {} };
  return node;
}

let off: (() => void) | undefined;
onMounted(() => {
  let describeStack: string[] = [];
  let currentSpec = "";
  off = sp.listen((data) => {
    const d = data as Record<string, any>;
    if (d.type === "done" && watching.value) return run();
    if (d.type === "action" && d.action === "clear-errors" && d.source === "jest") {
      currentSpec = d.path;
      return;
    }
    if (d.type !== "test") return;
    switch (d.event) {
      case "initialize_tests":
        describeStack = [];
        currentSpec = "";
        if (watching.value) runAll();
        else {
          status.value = "idle";
          specs.value = {};
        }
        return;
      case "total_test_start":
        describeStack = [];
        status.value = "running";
        return;
      case "total_test_end":
        status.value = "complete";
        duration.value = Date.now() - startedAt.value;
        return;
      case "add_file":
        specs.value[d.path] = { name: d.path, tests: {}, describes: {} };
        return;
      case "remove_file":
        delete specs.value[d.path];
        return;
      case "file_error":
        if (specs.value[d.path]) specs.value[d.path]!.error = d.error;
        return;
      case "describe_start":
        describeStack.push(d.blockName);
        if (currentSpec) container(currentSpec, describeStack);
        return;
      case "describe_end":
        describeStack.pop();
        return;
      case "add_test":
        container(d.path, describeStack).tests[d.testName] = { status: "idle", errors: [], name: d.testName, blocks: [...describeStack], path: d.path };
        return;
      case "test_start": {
        const t = d.test;
        container(t.path, t.blocks).tests[t.name] = { status: "running", name: t.name, blocks: t.blocks, path: t.path, errors: [] };
        return;
      }
      case "test_end": {
        const t = d.test;
        container(t.path, t.blocks).tests[t.name] = { status: t.status, errors: t.errors ?? [], duration: t.duration, name: t.name, blocks: t.blocks, path: t.path };
        return;
      }
    }
  }, id);
  if (frame.value) sp.register(frame.value, id);
});
onBeforeUnmount(() => {
  off?.();
  sp.unregister(id);
});

/* ──────────── отображение ──────────── */

interface Line {
  key: string;
  depth: number;
  kind: "describe" | "test" | "error";
  text: string;
  status?: Test["status"];
  duration?: number;
}

function flatten(node: { tests: Record<string, Test>; describes: Record<string, Describe> }, depth: number, prefix: string, out: Line[]) {
  for (const t of Object.values(node.tests)) {
    out.push({ key: `${prefix}/t:${t.name}`, depth, kind: "test", text: t.name, status: t.status, duration: t.duration });
    if (t.status === "fail") for (const [i, e] of t.errors.entries()) out.push({ key: `${prefix}/t:${t.name}/e${i}`, depth: depth + 1, kind: "error", text: cleanError(e.message ?? String(e)) });
  }
  for (const dsc of Object.values(node.describes)) {
    out.push({ key: `${prefix}/d:${dsc.name}`, depth, kind: "describe", text: dsc.name });
    flatten(dsc, depth + 1, `${prefix}/d:${dsc.name}`, out);
  }
}

// сообщения Jest приходят с ANSI-цветами — в панели они не нужны
const cleanError = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, "");

function allTests(node: { tests: Record<string, Test>; describes: Record<string, Describe> }): Test[] {
  return [...Object.values(node.tests), ...Object.values(node.describes).flatMap(allTests)];
}

const view = computed(() =>
  Object.values(specs.value).map((spec) => {
    const tests = allTests(spec);
    const failed = tests.some((t) => t.status === "fail") || Boolean(spec.error);
    const lines: Line[] = [];
    if (verbose.value || failed) flatten(spec, 1, spec.name, lines);
    return { spec, lines, failed, running: tests.some((t) => t.status === "running") };
  }),
);

const summary = computed(() => {
  const tests = Object.values(specs.value).flatMap(allTests);
  const specList = Object.values(specs.value);
  return {
    pass: tests.filter((t) => t.status === "pass").length,
    fail: tests.filter((t) => t.status === "fail").length,
    total: tests.length,
    suitesPass: specList.filter((s) => !s.error && allTests(s).every((t) => t.status === "pass")).length,
    suitesFail: specList.filter((s) => s.error || allTests(s).some((t) => t.status === "fail")).length,
  };
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <iframe ref="frame" title="Тесты" class="hidden" />
    <div class="flex h-10 shrink-0 items-center gap-1.5 border-b pr-1.5 pl-3">
      <span class="label mr-auto">Тесты</span>
      <button
        type="button"
        :aria-pressed="suiteOnly"
        :class="cn('h-7 rounded-md border px-2 text-[12px] transition-colors', suiteOnly ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')"
        title="Только открытый файл тестов"
        @click="suiteOnly = !suiteOnly"
      >
        Только файл
      </button>
      <button
        type="button"
        :aria-pressed="verbose"
        :class="cn('h-7 rounded-md border px-2 text-[12px] transition-colors', verbose ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')"
        @click="verbose = !verbose"
      >
        Подробно
      </button>
      <button
        type="button"
        :aria-pressed="watching"
        :class="cn('h-7 rounded-md border px-2 text-[12px] transition-colors', watching ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')"
        title="Перезапускать тесты при изменениях"
        @click="watching = !watching"
      >
        Watch
      </button>
      <SandboxIconButton label="Запустить тесты" @click="run"><PlayIcon class="size-3.5" /></SandboxIconButton>
    </div>

    <div class="thin-scrollbar min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-5">
      <div v-if="status === 'initialising' || (status === 'running' && !view.length)" class="flex items-center gap-2 text-muted-foreground">
        <LoaderIcon class="size-3.5 animate-spin" /> Запуск тестов…
      </div>
      <div v-else-if="!view.length" class="text-muted-foreground">Файлы тестов не найдены (*.test.ts, *.spec.ts)</div>

      <div v-for="v in view" :key="v.spec.name" class="mb-3">
        <div class="flex items-center gap-2">
          <span
            :class="
              cn(
                'rounded-sm px-1.5 text-[10px] font-semibold tracking-wider uppercase',
                v.running ? 'bg-muted text-muted-foreground' : v.failed ? 'bg-foreground text-background' : 'border text-foreground',
              )
            "
            >{{ v.running ? "run" : v.failed ? "fail" : "pass" }}</span
          >
          <span class="text-muted-foreground">{{ v.spec.name.replace(/^\//, "") }}</span>
        </div>
        <pre v-if="v.spec.error" class="mt-1 ml-4 whitespace-pre-wrap text-foreground">{{ cleanError(v.spec.error.message ?? String(v.spec.error)) }}</pre>
        <div v-for="l in v.lines" :key="l.key" :style="{ paddingLeft: `${l.depth}rem` }">
          <div v-if="l.kind === 'describe'" class="text-foreground">{{ l.text }}</div>
          <div v-else-if="l.kind === 'test'" class="flex items-center gap-1.5">
            <LoaderIcon v-if="l.status === 'running'" class="size-3 animate-spin text-muted-foreground" />
            <CheckIcon v-else-if="l.status === 'pass'" class="size-3 text-foreground" />
            <XIcon v-else-if="l.status === 'fail'" class="size-3 text-foreground" />
            <span v-else class="size-3" />
            <span :class="l.status === 'fail' ? 'text-foreground' : 'text-muted-foreground'">{{ l.text }}</span>
            <span v-if="l.duration !== undefined" class="text-faint">({{ l.duration }} мс)</span>
          </div>
          <pre v-else class="my-1 overflow-x-auto rounded-md border bg-muted/50 p-2 whitespace-pre-wrap text-foreground">{{ l.text }}</pre>
        </div>
      </div>

      <div v-if="status === 'complete' && view.length" class="mt-4 space-y-0.5 border-t pt-3">
        <div>
          <span class="text-muted-foreground">Наборы: </span>
          <span v-if="summary.suitesFail" class="text-foreground">{{ summary.suitesFail }} упало, </span>
          <span>{{ summary.suitesPass }} прошло</span>
        </div>
        <div>
          <span class="text-muted-foreground">Тесты: </span>
          <span v-if="summary.fail" class="text-foreground">{{ summary.fail }} упало, </span>
          <span>{{ summary.pass }} прошло, {{ summary.total }} всего</span>
        </div>
        <div><span class="text-muted-foreground">Время: </span>{{ (duration / 1000).toFixed(2) }} с</div>
      </div>
    </div>
  </div>
</template>
