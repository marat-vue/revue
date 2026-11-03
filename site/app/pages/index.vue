<script setup lang="ts">
import { ArrowUpRightIcon } from "lucide-vue-next";
import type { HomeData } from "#shared/types/content";

const { data } = await useFetch<HomeData>("/api/home", { key: "home" });
</script>

<template>
  <main v-if="data" class="flex-1">
    <!-- ─────────── Hero ─────────── -->
    <section class="relative overflow-hidden border-b">
      <div class="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]" />
      <div class="relative mx-auto max-w-[1440px] px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20">
        <div class="label animate-rise">{{ BRAND.name }} · конспект · {{ data.lessonsCount }} уроков · {{ data.sections.length }} разделов</div>
        <h1 class="mt-6 animate-rise text-[clamp(3rem,10vw,8.5rem)] leading-[0.88] font-semibold tracking-[-0.055em] [animation-delay:80ms]">
          <span class="text-[color-mix(in_oklch,var(--muted-foreground)_40%,var(--background))]">{{ BRAND.prefix }}</span>{{ BRAND.suffix }}
          <br />
          <!-- непрозрачный цвет: при полупрозрачном пересечения букв (TT) светлеют -->
          <span class="text-[color-mix(in_oklch,var(--muted-foreground)_35%,var(--background))]">от HTTP</span> до&nbsp;Nuxt
        </h1>
        <div class="mt-10 grid animate-rise gap-10 [animation-delay:160ms] lg:grid-cols-[1fr_auto] lg:items-end">
          <p class="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Фронтенд, бэкенд, инструменты и&nbsp;подготовка к&nbsp;собеседованиям. Читайте уроки, запускайте примеры в&nbsp;песочнице
            и&nbsp;закрепляйте знания интервальными повторениями по&nbsp;алгоритму FSRS. Работает офлайн, прогресс хранится только в&nbsp;вашем браузере.
          </p>
          <HomeStats :all-ids="data.allIds" />
        </div>
        <div class="mt-10 animate-rise [animation-delay:240ms]">
          <ContinueCard />
        </div>
      </div>
    </section>

    <!-- ─────────── Разделы ─────────── -->
    <section class="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-20">
      <div class="mb-8 flex items-end justify-between gap-4">
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Разделы</h2>
        <span class="label">Пройдено <CompletionPct :ids="data.allIds" class="text-foreground" /></span>
      </div>

      <SectionsBrowser :sections="data.sections" />

      <div v-if="data.extras.length > 0" class="mt-14">
        <div class="label mb-4">Дополнительно</div>
        <div class="grid border-t border-l sm:grid-cols-3">
          <NuxtLink
            v-for="e in data.extras"
            :key="e.id"
            :to="e.href"
            class="group flex items-center gap-4 border-r border-b px-6 py-5 transition-colors hover:bg-muted"
          >
            <span class="font-mono text-sm text-muted-foreground">{{ e.num }}</span>
            <span class="font-medium">{{ e.title }}</span>
            <ArrowUpRightIcon class="ml-auto size-4 opacity-40 transition-opacity group-hover:opacity-100" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
