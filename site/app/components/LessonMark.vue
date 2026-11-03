<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { CheckIcon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";

/** Статус урока: пусто / открыт / изучен / в колоде. */
const props = defineProps<{ id: string; class?: HTMLAttributes["class"] }>();
const store = useAppStore();
const done = computed(() => store.hydrated && Boolean(store.progress.lessons[props.id]?.c));
const seen = computed(() => store.hydrated && Boolean(store.progress.lessons[props.id]?.v));
const inDeck = computed(() => store.hydrated && Boolean(store.srs.cards[props.id]));
</script>

<template>
  <span
    :class="
      cn(
        'relative grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
        done ? 'border-foreground bg-foreground text-background' : seen ? 'border-foreground/60' : 'border-border',
        props.class,
      )
    "
    :title="done ? 'Изучено' : seen ? 'Открыт' : 'Не начат'"
  >
    <CheckIcon v-if="done" class="size-2.5" :stroke-width="3" />
    <span v-else-if="seen" class="size-1 rounded-full bg-foreground/70" />
    <span v-if="inDeck" class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-foreground ring-2 ring-background" />
  </span>
</template>
