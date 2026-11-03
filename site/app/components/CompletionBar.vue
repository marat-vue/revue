<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useAppStore } from "~/stores/app";

/** Тонкая полоса прогресса по списку уроков. */
const props = defineProps<{ ids: string[]; class?: HTMLAttributes["class"] }>();
const store = useAppStore();
const completion = useCompletion(() => props.ids);
</script>

<template>
  <div :class="cn('h-px w-full overflow-hidden bg-border', props.class)">
    <div class="h-full bg-foreground transition-[width] duration-700 ease-out" :style="{ width: store.hydrated ? `${completion.pct * 100}%` : 0 }" />
  </div>
</template>
