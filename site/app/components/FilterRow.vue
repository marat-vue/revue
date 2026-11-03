<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
    <span class="label w-28 shrink-0">{{ label }}</span>
    <div class="thin-scrollbar flex min-w-0 gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0"><slot /></div>
  </div>
</template>
