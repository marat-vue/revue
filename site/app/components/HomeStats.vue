<script setup lang="ts">
import { useAppStore } from "~/stores/app";

const props = defineProps<{ allIds: string[] }>();
const store = useAppStore();
const completion = useCompletion(() => props.allIds);
const due = useDueSummary();
const days = computed(() => streak(activityByDay(store.srs, store.progress)));
const v = (n: number) => (store.hydrated ? n : "–");

const stats = computed(() => [
  { value: v(completion.value.done), label: "Изучено", sub: `из ${completion.value.total}` },
  { value: v(Object.keys(store.srs.cards).length), label: "В колоде", sub: "карточек" },
  { value: v(due.value.total), label: "Сегодня", sub: "к повторению" },
  { value: v(days.value), label: "Серия", sub: store.hydrated ? plural(days.value, ["день", "дня", "дней"]) : "дней" },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-y-6 sm:flex sm:gap-0">
    <div
      v-for="s in stats"
      :key="s.label"
      class="min-w-0 border-l pl-4 odd:border-l-0 odd:pl-0 sm:pl-6 sm:odd:border-l sm:odd:pl-6 sm:first:border-l-0 sm:first:pl-0"
    >
      <div class="font-mono text-3xl font-light tracking-tighter tabular-nums sm:text-4xl">{{ s.value }}</div>
      <div class="label mt-2 whitespace-nowrap">{{ s.label }}</div>
      <div class="mt-0.5 font-mono text-[11px] text-muted-foreground">{{ s.sub }}</div>
    </div>
  </div>
</template>
