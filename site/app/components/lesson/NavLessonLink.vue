<script setup lang="ts">
import type { NavNode } from "#shared/types/content";

defineProps<{ node: NavNode; active: boolean }>();
</script>

<template>
  <NuxtLink
    :to="node.href"
    :data-active="active || undefined"
    :class="
      cn(
        'group flex items-start gap-2.5 rounded-md py-1.5 pr-2 pl-2 text-[13px] leading-snug text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
        active && 'bg-foreground text-background hover:bg-foreground hover:text-background',
      )
    "
  >
    <LessonMark :id="node.id" :class="cn('mt-px scale-90', active && 'border-background/40')" />
    <span class="min-w-0 flex-1">{{ node.title }}</span>
  </NuxtLink>
</template>
