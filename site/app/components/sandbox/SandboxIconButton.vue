<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>();
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :title="label"
    :aria-label="label"
    class="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-7"
  >
    <slot />
  </button>
</template>
