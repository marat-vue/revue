<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon, PanelLeftIcon } from "lucide-vue-next";
import type { LessonPage } from "#shared/types/content";

const props = defineProps<{ page: LessonPage }>();
const body = ref<HTMLElement | null>(null);
const { slots } = useArticleEnhancer(body);
const mobileNavOpen = ref(false);

const closeOnLink = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest("a")) mobileNavOpen.value = false;
};
</script>

<template>
  <ReadingProgress />
  <div class="mx-auto grid w-full max-w-[1440px] flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
    <aside class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] border-r lg:block">
      <SectionNav :tree="page.tree" :sections="page.sections" :current-id="page.node.id" />
    </aside>

    <main class="min-w-0 px-4 pt-6 pb-24 sm:px-8 lg:px-12 xl:px-16">
      <div class="mb-8 flex items-center gap-3 lg:hidden">
        <Sheet v-model:open="mobileNavOpen" side="left" title="Содержание раздела" sr-title class="w-[88vw] gap-0 p-0 sm:max-w-sm">
          <template #trigger>
            <Button variant="outline" size="sm"><PanelLeftIcon /> Содержание раздела</Button>
          </template>
          <div class="h-full min-h-0" @click="closeOnLink">
            <SectionNav :tree="page.tree" :sections="page.sections" :current-id="page.node.id" />
          </div>
        </Sheet>
      </div>

      <article class="mx-auto max-w-[760px]">
        <Breadcrumbs :chain="page.parents" />
        <header class="mt-8 animate-rise">
          <div class="label flex items-center gap-3">
            <span>Урок {{ page.node.num }}</span>
            <span class="h-px w-6 bg-border" />
            <span>{{ page.minutes }} {{ plural(page.minutes, ["минута", "минуты", "минут"]) }} чтения</span>
          </div>
          <h1
            class="mt-4 text-[1.75rem] leading-[1.12] font-semibold tracking-[-0.035em] text-balance [overflow-wrap:anywhere] sm:text-[2.75rem] sm:leading-[1.08]"
          >
            {{ page.title }}
          </h1>
          <div class="mt-7">
            <LessonActions :id="page.node.id" :href="page.node.href" :title="page.node.title" />
          </div>
        </header>

        <details v-if="page.toc.length > 0" class="mt-8 rounded-md border px-4 xl:hidden">
          <summary class="cursor-pointer py-3 text-sm font-medium">На этой странице</summary>
          <div class="pb-4"><Toc :items="page.toc" /></div>
        </details>

        <div id="lesson-body" ref="body" class="prose mt-10 animate-rise [animation-delay:80ms]" v-html="page.html" />
        <Teleport v-for="(s, i) in slots" :key="i" :to="s.el">
          <LiveExample :blocks="s.blocks" />
        </Teleport>

        <div class="mt-16 border-t pt-8">
          <LessonActions :id="page.node.id" :href="page.node.href" :title="page.node.title" variant="footer" />
        </div>

        <nav class="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          <NuxtLink v-if="page.prev" :to="page.prev.href" class="group flex flex-col gap-1.5 bg-background p-5 transition-colors hover:bg-muted/60">
            <span class="label flex items-center gap-2"><ArrowLeftIcon class="size-3 transition-transform group-hover:-translate-x-1" /> Назад</span>
            <span class="line-clamp-2 leading-snug font-medium">{{ page.prev.title }}</span>
          </NuxtLink>
          <span v-else class="hidden bg-background sm:block" />
          <NuxtLink v-if="page.next" :to="page.next.href" class="group flex flex-col items-end gap-1.5 bg-background p-5 text-right transition-colors hover:bg-muted/60">
            <span class="label flex items-center gap-2">Далее <ArrowRightIcon class="size-3 transition-transform group-hover:translate-x-1" /></span>
            <span class="line-clamp-2 leading-snug font-medium">{{ page.next.title }}</span>
          </NuxtLink>
          <span v-else class="hidden bg-background sm:block" />
        </nav>
      </article>
    </main>

    <aside class="thin-scrollbar sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto py-10 pr-6 xl:block">
      <Toc :items="page.toc" />
    </aside>
  </div>
</template>
