<script setup lang="ts">
import { MoonIcon, SunIcon } from "lucide-vue-next";

const colorMode = useColorMode();
const toggle = () => (colorMode.preference = colorMode.value === "dark" ? "light" : "dark");
</script>

<template>
  <Button variant="ghost" size="icon" class="size-11 md:size-8" aria-label="Сменить тему" @click="toggle">
    <SunIcon class="hidden dark:block" />
    <MoonIcon class="dark:hidden" />
  </Button>
</template>
