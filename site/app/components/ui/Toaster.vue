<script setup lang="ts">
import { Toaster as Sonner } from "vue-sonner";
import "vue-sonner/style.css";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-vue-next";

const colorMode = useColorMode();
const theme = computed(() => (colorMode.preference === "system" ? "system" : (colorMode.value as "light" | "dark")));
</script>

<template>
  <Sonner
    :theme="theme"
    class="toaster group"
    position="bottom-center"
    :toast-options="{ class: 'cn-toast' }"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
  >
    <template #success-icon><CircleCheckIcon class="size-4" /></template>
    <template #info-icon><InfoIcon class="size-4" /></template>
    <template #warning-icon><TriangleAlertIcon class="size-4" /></template>
    <template #error-icon><OctagonXIcon class="size-4" /></template>
    <template #loading-icon><Loader2Icon class="size-4 animate-spin" /></template>
  </Sonner>
</template>
