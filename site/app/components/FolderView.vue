<script setup lang="ts">
import { ArrowRightIcon } from "lucide-vue-next";
import type { FolderPage } from "#shared/types/content";

const props = defineProps<{ page: FolderPage }>();
const folders = computed(() => props.page.children.filter((c) => c.kind === "folder"));
const directLessons = computed(() => props.page.children.filter((c) => c.kind === "lesson"));
</script>

<template>
  <main class="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 sm:px-6 sm:py-16">
    <Breadcrumbs :chain="page.parents" />

    <header class="mt-8 grid min-w-0 gap-8 border-b pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div class="min-w-0 animate-rise">
        <div v-if="page.node.num" class="font-mono text-7xl leading-none font-extralight tracking-tighter text-muted-foreground/40 sm:text-8xl">{{ page.node.num }}</div>
        <h1 class="mt-4 text-3xl leading-[1.08] font-semibold tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-6xl sm:leading-[1.02]">{{ page.node.title }}</h1>
        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
          <span v-if="folders.length > 0">{{ folders.length }} {{ plural(folders.length, ["тема", "темы", "тем"]) }}</span>
          <span>{{ page.ids.length }} {{ plural(page.ids.length, ["урок", "урока", "уроков"]) }}</span>
          <span>Изучено <CompletionText :ids="page.ids" class="text-foreground" /></span>
        </div>
      </div>
      <FolderActions :id="page.node.id" :ids="page.ids" />
    </header>
    <CompletionBar :ids="page.ids" class="-mt-px" />

    <div v-if="directLessons.length > 0" class="mt-10">
      <LessonRow v-for="l in directLessons" :key="l.id" :node="l" />
    </div>

    <div class="mt-6 space-y-14">
      <section v-for="(f, i) in folders" :key="f.id" class="animate-rise" :style="{ animationDelay: `${Math.min(i, 8) * 50}ms` }">
        <div class="sticky top-14 z-10 -mx-1 flex items-end gap-4 bg-background/90 px-1 pt-6 pb-3 backdrop-blur sm:-mx-3 sm:px-3">
          <span class="font-mono text-sm text-faint">{{ f.num }}</span>
          <NuxtLink :to="f.href" class="min-w-0 flex-1 text-xl font-semibold tracking-tight decoration-1 underline-offset-4 hover:underline">{{ f.title }}</NuxtLink>
          <span class="font-mono text-xs text-muted-foreground"><CompletionPct :ids="f.ids" /></span>
        </div>
        <CompletionBar :ids="f.ids" />
        <div>
          <template v-for="c in f.children" :key="c.id">
            <LessonRow v-if="c.kind === 'lesson'" :node="c" />
            <NuxtLink v-else :to="c.href" class="flex items-center gap-4 border-b px-1 py-3.5 hover:bg-muted/50 sm:px-3">
              <span class="w-7 font-mono text-xs text-faint">{{ c.num }}</span>
              <span class="flex-1 font-medium">{{ c.title }}</span>
              <span class="label">{{ c.ids.length }} ур.</span>
            </NuxtLink>
          </template>
        </div>
      </section>
    </div>
  </main>
</template>
