<script setup lang="ts">
import type { Crumb } from "#shared/types/content";

defineProps<{ chain: Crumb[] }>();
</script>

<template>
  <nav aria-label="Навигация" class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
    <NuxtLink to="/" class="transition-colors hover:text-foreground">Разделы</NuxtLink>
    <span v-for="c in chain" :key="c.id" class="flex min-w-0 items-start gap-2">
      <span class="shrink-0 text-faint">/</span>
      <NuxtLink :to="c.href" class="min-w-0 [overflow-wrap:anywhere] transition-colors hover:text-foreground">
        <span v-if="c.num" class="mr-1.5 text-faint">{{ c.num }}</span>{{ c.title }}
      </NuxtLink>
    </span>
  </nav>
</template>
