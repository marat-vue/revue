<script setup lang="ts">
import { ArrowRightIcon, BookOpenIcon, BrainIcon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";

const store = useAppStore();
const last = computed(() => store.progress.last);
const due = useDueSummary();
const hasDue = computed(() => due.value.total > 0);
</script>

<template>
  <div
    :class="
      cn(
        'grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-lg border bg-border transition-opacity sm:grid-cols-2',
        !store.hydrated && 'opacity-0',
      )
    "
  >
    <NuxtLink :to="last?.href ?? '/l/01/'" class="group flex min-w-0 items-center gap-3 bg-background p-4 transition-colors hover:bg-muted/60 sm:gap-4 sm:p-5">
      <span class="grid size-10 shrink-0 place-items-center rounded-md border">
        <BookOpenIcon class="size-4" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="label block">{{ last ? "Продолжить чтение" : "Начать с первого раздела" }}</span>
        <span class="mt-1 block truncate font-medium">{{ last?.title ?? "Web технологии" }}</span>
      </span>
      <ArrowRightIcon class="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </NuxtLink>
    <NuxtLink
      to="/review/"
      :class="
        cn(
          'group flex min-w-0 items-center gap-3 p-4 transition-colors sm:gap-4 sm:p-5',
          hasDue ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-background hover:bg-muted/60',
        )
      "
    >
      <span :class="cn('grid size-10 shrink-0 place-items-center rounded-md border', hasDue && 'border-background/25')">
        <BrainIcon class="size-4" />
      </span>
      <span class="min-w-0 flex-1">
        <span :class="cn('label block', hasDue && 'text-background/60')">Интервальное повторение</span>
        <span class="mt-1 block truncate font-medium">
          {{ hasDue ? `${due.total} ${plural(due.total, ["карточка ждёт", "карточки ждут", "карточек ждут"])}` : "На сегодня всё повторено" }}
        </span>
      </span>
      <ArrowRightIcon class="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </NuxtLink>
  </div>
</template>
