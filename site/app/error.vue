<script setup lang="ts">
import type { NuxtError } from "#app";
import { TooltipProvider } from "reka-ui";

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);

useHead({ title: notFound.value ? "Не найдено" : "Ошибка", titleTemplate: (t) => (t ? `${t} · ${BRAND.name}` : BRAND.title) });

const home = () => clearError({ redirect: "/" });
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <SiteHeader />
    <main class="grid flex-1 place-items-center px-4 py-24">
      <div class="text-center">
        <div class="font-mono text-[clamp(6rem,20vw,12rem)] leading-none font-extralight tracking-tighter text-muted-foreground/30">
          {{ error.statusCode || 500 }}
        </div>
        <h1 class="mt-4 text-2xl font-semibold tracking-tight">{{ notFound ? "Такой страницы нет" : "Что-то пошло не так" }}</h1>
        <p class="mt-2 text-muted-foreground">{{ notFound ? "Возможно, урок переименовали или перенесли." : "Попробуйте обновить страницу." }}</p>
        <Button size="lg" class="mt-8 px-5" @click="home">К разделам</Button>
      </div>
    </main>
    <CommandMenu />
    <Toaster />
  </TooltipProvider>
</template>
