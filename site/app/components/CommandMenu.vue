<script setup lang="ts">
import { BarChart3Icon, BrainIcon, CheckIcon, FileTextIcon, HomeIcon, MoonIcon, SearchIcon, SettingsIcon } from "lucide-vue-next";
import type { Component } from "vue";
import { useAppStore } from "~/stores/app";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const LIMIT = 60;

const open = ref(false);
const query = ref("");
const selected = ref(0);
const listRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const store = useAppStore();
const colorMode = useColorMode();
const index = useSearchIndex(() => open.value);

function onKey(e: KeyboardEvent) {
  if ((e.key === "k" || e.key === "K" || e.code === "KeyK") && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    open.value = !open.value;
  } else if (e.key === "/" && !(e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) {
    e.preventDefault();
    open.value = true;
  }
}
const onOpen = () => (open.value = true);
onMounted(() => {
  window.addEventListener("keydown", onKey);
  window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
});

const prepared = computed(() => index.value?.map((e) => ({ ...e, hay: norm(`${e.title} ${e.path}`) })) ?? []);

const results = computed(() => {
  const words = norm(query.value).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const e of prepared.value) {
    if (words.every((w) => e.hay.includes(w))) {
      out.push(e);
      if (out.length >= LIMIT) break;
    }
  }
  return out;
});

interface Action {
  key: string;
  label: string;
  icon: Component;
  run: () => void;
  shortcut?: string;
}

const actions = computed<Action[]>(() => [
  { key: "home", label: "Разделы", icon: HomeIcon, run: () => go("/") },
  { key: "review", label: "Повторение", icon: BrainIcon, run: () => go("/review/") },
  { key: "stats", label: "Статистика", icon: BarChart3Icon, run: () => go("/stats/") },
  { key: "settings", label: "Настройки", icon: SettingsIcon, run: () => go("/settings/") },
  {
    key: "theme",
    label: "Сменить тему",
    icon: MoonIcon,
    shortcut: colorMode.value === "dark" ? "светлая" : "тёмная",
    run: () => {
      colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
      open.value = false;
    },
  },
]);

const itemCount = computed(() => (query.value ? results.value.length : actions.value.length));

watch(query, () => (selected.value = 0));
watch(open, (o) => {
  if (o) {
    selected.value = 0;
    nextTick(() => inputRef.value?.focus());
  }
});

async function go(href: string) {
  open.value = false;
  query.value = "";
  await navigateTo(href);
}

function choose(i: number) {
  if (query.value) {
    const r = results.value[i];
    if (r) go(r.href);
  } else actions.value[i]?.run();
}

function onInputKey(e: KeyboardEvent) {
  if (!itemCount.value) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    selected.value = (selected.value + step + itemCount.value) % itemCount.value;
    nextTick(() => listRef.value?.querySelector("[data-selected=true]")?.scrollIntoView({ block: "nearest" }));
  } else if (e.key === "Enter") {
    e.preventDefault();
    choose(selected.value);
  }
}

const itemClass =
  "group/command-item relative flex w-full cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-hidden select-none data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
const headingClass = "px-2 py-1.5 text-xs font-medium text-muted-foreground";
</script>

<template>
  <Dialog v-model:open="open" title="Поиск" description="Поиск по урокам" sr-only-header class="top-1/3 translate-y-0 gap-0 overflow-hidden rounded-xl! p-0 sm:max-w-2xl">
    <div data-slot="command" class="flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground">
      <div class="p-1 pb-0">
        <label class="flex h-8 items-center gap-2 rounded-lg border border-input/30 bg-input/30 pl-2">
          <SearchIcon class="size-4 shrink-0 opacity-50" />
          <input
            ref="inputRef"
            v-model="query"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            placeholder="Найти урок: замыкания, CORS, useEffect…"
            class="h-full w-full min-w-0 bg-transparent pr-2 text-sm outline-hidden placeholder:text-muted-foreground"
            @keydown="onInputKey"
          />
        </label>
      </div>
      <div id="command-list" ref="listRef" role="listbox" class="no-scrollbar max-h-[min(60vh,480px)] scroll-py-1 overflow-x-hidden overflow-y-auto outline-none thin-scrollbar">
        <template v-if="query">
          <div v-if="!results.length" class="py-6 text-center text-sm">{{ index ? "Ничего не найдено" : "Загрузка индекса…" }}</div>
          <div v-else class="overflow-hidden p-1 text-foreground">
            <div :class="headingClass">Уроки · {{ results.length }}{{ results.length === LIMIT ? "+" : "" }}</div>
            <button
              v-for="(r, i) in results"
              :key="r.id"
              type="button"
              role="option"
              :aria-selected="selected === i"
              :data-selected="selected === i"
              :class="cn(itemClass, 'items-start py-2')"
              @mousemove="selected = i"
              @click="go(r.href)"
            >
              <FileTextIcon class="mt-0.5 opacity-60" />
              <div class="min-w-0 flex-1">
                <div class="truncate">{{ r.title }}</div>
                <div class="truncate font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{{ r.path }}</div>
              </div>
              <CheckIcon v-if="store.progress.lessons[r.id]?.c" class="mt-0.5 size-3.5" />
            </button>
          </div>
        </template>
        <div v-else class="overflow-hidden p-1 text-foreground">
          <div :class="headingClass">Навигация</div>
          <button
            v-for="(a, i) in actions"
            :key="a.key"
            type="button"
            role="option"
            :aria-selected="selected === i"
            :data-selected="selected === i"
            :class="itemClass"
            @mousemove="selected = i"
            @click="a.run()"
          >
            <component :is="a.icon" />
            {{ a.label }}
            <span v-if="a.shortcut" class="ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground">{{ a.shortcut }}</span>
          </button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
