<script setup lang="ts">
const props = defineProps<{ modelValue: number; min: number; max: number; step: number; format: (v: number) => string }>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
</script>

<template>
  <div class="flex w-full items-center gap-4">
    <Slider :model-value="modelValue" :min="min" :max="max" :step="step" @update:model-value="emit('update:modelValue', $event)" />
    <span class="w-14 shrink-0 text-right font-mono text-sm tabular-nums">{{ props.format(modelValue) }}</span>
  </div>
</template>
