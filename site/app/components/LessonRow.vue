<script setup lang="ts">
import { ArrowRightIcon } from "lucide-vue-next";
import type { Crumb } from "#shared/types/content";

defineProps<{ node: Crumb }>();
</script>

<template>
  <NuxtLink :to="node.href" class="group flex items-center gap-4 border-b px-1 py-3.5 transition-colors hover:bg-muted/50 sm:px-3">
    <span class="w-7 shrink-0 font-mono text-xs text-faint tabular-nums">{{ node.num }}</span>
    <span class="min-w-0 flex-1 text-[15px] leading-snug transition-transform duration-300 group-hover:translate-x-1">{{ node.title }}</span>
    <LessonMark :id="node.id" />
    <ArrowRightIcon class="size-4 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
  </NuxtLink>
</template>
