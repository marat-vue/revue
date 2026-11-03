<script setup lang="ts">
/** Строка настроек: название и описание слева, элемент управления справа. wide — для офлайн-раздела. */
defineProps<{ title: string; desc?: string; wide?: boolean }>();
</script>

<template>
  <div :class="cn('grid gap-4 border-b py-7 md:items-center md:gap-10', wide ? 'md:grid-cols-[1fr_minmax(0,360px)]' : 'md:grid-cols-[1fr_minmax(0,320px)]')">
    <div>
      <div class="font-medium">{{ title }}</div>
      <div class="mt-1 text-sm leading-relaxed text-muted-foreground">
        <slot name="desc">{{ desc }}</slot>
      </div>
    </div>
    <div :class="wide ? 'flex flex-wrap items-center justify-start gap-2 md:justify-end' : 'flex items-center justify-start md:justify-end'"><slot /></div>
  </div>
</template>
