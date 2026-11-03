<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useAppStore } from "~/stores/app";

const props = defineProps<{ ids: string[]; class?: HTMLAttributes["class"] }>();
const store = useAppStore();
const completion = useCompletion(() => props.ids);
</script>

<template>
  <span :class="cn('font-mono tabular-nums', props.class)"
    >{{ store.hydrated ? completion.done : "–" }}<span class="text-muted-foreground">/{{ completion.total }}</span></span
  >
</template>
