<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "reka-ui";

const props = defineProps<{ modelValue: number; min: number; max: number; step: number }>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const value = computed({
  get: () => [props.modelValue],
  set: (v) => v?.[0] !== undefined && emit("update:modelValue", v[0]),
});
</script>

<template>
  <SliderRoot
    v-model="value"
    data-slot="slider"
    :min="min"
    :max="max"
    :step="step"
    class="relative flex w-full touch-none items-center select-none data-disabled:opacity-50"
  >
    <SliderTrack data-slot="slider-track" class="relative h-1 w-full grow overflow-hidden rounded-full bg-muted select-none">
      <SliderRange data-slot="slider-range" class="absolute h-full bg-primary select-none" />
    </SliderTrack>
    <SliderThumb
      data-slot="slider-thumb"
      class="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
