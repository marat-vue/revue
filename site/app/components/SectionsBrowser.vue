<script setup lang="ts">
import { ArrowUpRightIcon, SearchIcon, XIcon } from "lucide-vue-next";
import { useLocalStorage } from "@vueuse/core";
import type { SectionCard } from "#shared/types/content";
import { useAppStore } from "~/stores/app";

type Status = "all" | "new" | "progress" | "done";

const STATUSES: { id: Status; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "new", label: "Не начаты" },
  { id: "progress", label: "В процессе" },
  { id: "done", label: "Пройдены" },
];

interface Filters {
  category: CategoryId | null;
  language: LanguageId | null;
  status: Status;
}

const EMPTY: Filters = { category: null, language: null, status: "all" };

const props = defineProps<{ sections: SectionCard[] }>();

// фильтры — удобство конкретного браузера, поэтому localStorage, а не общий стор; поиск не запоминаем
const filters = useLocalStorage<Filters>("refront:section-filters", { ...EMPTY }, { initOnMounted: true, mergeDefaults: true });
const search = ref("");
const store = useAppStore();

const statusOf = computed(() => {
  const map = new Map<string, Exclude<Status, "all">>();
  for (const s of props.sections) {
    let done = 0;
    let touched = 0;
    for (const id of s.ids) {
      const p = store.progress.lessons[id];
      if (p?.c) done++;
      if (p?.c || p?.v) touched++;
    }
    map.set(s.id, done === s.ids.length && done > 0 ? "done" : touched > 0 ? "progress" : "new");
  }
  return map;
});

const set = (patch: Partial<Filters>) => (filters.value = { ...filters.value, ...patch });
const reset = () => {
  filters.value = { ...EMPTY };
  search.value = "";
};
const query = computed(() => search.value.trim().toLowerCase());

// каждая группа фильтров считает количество с учётом остальных выбранных фильтров
const matches = (s: SectionCard, skip?: keyof Filters) =>
  (skip === "category" || !filters.value.category || s.categories.includes(filters.value.category)) &&
  (skip === "language" || !filters.value.language || s.languages.includes(filters.value.language)) &&
  (skip === "status" || filters.value.status === "all" || !store.hydrated || statusOf.value.get(s.id) === filters.value.status) &&
  (!query.value || s.title.toLowerCase().includes(query.value));

const visible = computed(() => props.sections.filter((s) => matches(s)));
const categories = computed(() => CATEGORIES.filter((c) => props.sections.some((s) => s.categories.includes(c.id))));
const languages = computed(() => LANGUAGES.filter((l) => props.sections.some((s) => s.languages.includes(l.id))));
const active = computed(() => Boolean(filters.value.category || filters.value.language || filters.value.status !== "all" || query.value));
const count = (pred: (s: SectionCard) => boolean) => props.sections.filter(pred).length;
const categoryLabels = (s: SectionCard) =>
  s.categories
    .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join(" · ");
</script>

<template>
  <div>
    <div class="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 border-y py-5">
      <FilterRow label="Направление">
        <FilterChip :active="!filters.category" :count="count((s) => matches(s, 'category'))" @click="set({ category: null })">Все</FilterChip>
        <FilterChip
          v-for="c in categories"
          :key="c.id"
          :active="filters.category === c.id"
          :count="count((s) => s.categories.includes(c.id) && matches(s, 'category'))"
          @click="set({ category: filters.category === c.id ? null : c.id })"
        >
          {{ c.label }}
        </FilterChip>
      </FilterRow>

      <FilterRow label="Язык">
        <FilterChip :active="!filters.language" @click="set({ language: null })">Любой</FilterChip>
        <FilterChip
          v-for="l in languages"
          :key="l.id"
          :active="filters.language === l.id"
          :count="count((s) => s.languages.includes(l.id) && matches(s, 'language'))"
          @click="set({ language: filters.language === l.id ? null : l.id })"
        >
          {{ l.label }}
        </FilterChip>
      </FilterRow>

      <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterRow label="Статус">
          <FilterChip v-for="st in STATUSES" :key="st.id" :active="filters.status === st.id" @click="set({ status: st.id })">{{ st.label }}</FilterChip>
        </FilterRow>

        <div class="flex items-center gap-2">
          <label class="relative flex h-11 w-full min-w-0 items-center sm:h-8 lg:w-64">
            <SearchIcon class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              v-model="search"
              placeholder="Найти раздел"
              aria-label="Найти раздел по названию"
              class="h-full w-full min-w-0 rounded-md border bg-muted/40 pr-2.5 pl-8 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-background"
            />
          </label>
          <button
            v-if="active"
            type="button"
            class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="reset"
          >
            <XIcon class="size-3.5" />
            Сбросить
          </button>
        </div>
      </div>
    </div>

    <div class="label mb-4">
      {{
        active
          ? `Показано ${visible.length} ${plural(visible.length, ["раздел", "раздела", "разделов"])} из ${sections.length}`
          : `${sections.length} ${plural(sections.length, ["раздел", "раздела", "разделов"])}`
      }}
    </div>

    <div v-if="visible.length === 0" class="grid place-items-center gap-3 border border-dashed px-6 py-16 text-center">
      <p class="text-muted-foreground">По выбранным фильтрам разделов нет.</p>
      <button type="button" class="text-[13px] underline underline-offset-4" @click="reset">Сбросить фильтры</button>
    </div>
    <div v-else class="grid border-t border-l sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <NuxtLink
        v-for="(s, i) in visible"
        :key="s.id"
        :to="s.href"
        class="group relative flex min-h-48 min-w-0 animate-rise flex-col border-r border-b p-5 transition-colors hover:bg-foreground hover:text-background sm:min-h-56 sm:p-6"
        :style="{ animationDelay: `${Math.min(i, 12) * 40}ms` }"
      >
        <div class="flex items-start justify-between">
          <span class="font-mono text-5xl font-light tracking-tighter text-muted-foreground/50 transition-colors group-hover:text-background/40">{{ s.num }}</span>
          <ArrowUpRightIcon
            class="size-5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          />
        </div>
        <h3 class="mt-auto pt-8 text-xl leading-tight font-medium tracking-tight">{{ s.title }}</h3>
        <div class="mt-2 flex flex-wrap gap-x-2 font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase group-hover:text-background/50">
          {{ categoryLabels(s) }}
        </div>
        <div class="mt-3 flex items-center justify-between font-mono text-[11px] tracking-wider text-muted-foreground uppercase group-hover:text-background/60">
          <span>{{ s.topics > 0 ? `${s.topics} тем · ` : "" }}{{ s.ids.length }} ур.</span>
          <CompletionText :ids="s.ids" class="[&>span]:group-hover:text-background/50" />
        </div>
        <CompletionBar :ids="s.ids" class="mt-3 group-hover:bg-background/20 [&>div]:group-hover:bg-background" />
      </NuxtLink>
    </div>
  </div>
</template>
