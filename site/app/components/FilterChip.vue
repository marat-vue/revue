<script setup lang="ts">
defineProps<{ active: boolean; count?: number }>();
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :class="
      cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] whitespace-nowrap transition-colors sm:h-8',
        active ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
      )
    "
  >
    <slot />
    <span v-if="count !== undefined" :class="cn('font-mono text-[11px] tabular-nums', active ? 'text-background/60' : 'text-muted-foreground/70')">{{ count }}</span>
  </button>
</template>
