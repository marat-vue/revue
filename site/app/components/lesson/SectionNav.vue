<script setup lang="ts">
import type { NavNode, SectionLink } from "#shared/types/content";

const props = defineProps<{ tree: NavNode | null; sections: SectionLink[]; currentId: string }>();
const root = ref<HTMLDivElement | null>(null);
const ids = computed(() => (props.tree ? navIds(props.tree) : []));

// прокрутить к активному уроку
function scrollToActive() {
  const el = root.value?.querySelector<HTMLElement>("[data-active]");
  if (el) setTimeout(() => el.scrollIntoView({ block: "center" }), 320);
}
onMounted(scrollToActive);
watch(() => props.currentId, () => nextTick(scrollToActive));
</script>

<template>
  <div ref="root" class="flex h-full flex-col">
    <div v-if="tree" class="border-b px-5 pt-6 pb-4">
      <NuxtLink :to="tree.href" class="group block">
        <div class="label">Раздел {{ tree.num }}</div>
        <div class="mt-1 text-lg font-semibold tracking-tight decoration-1 underline-offset-4 group-hover:underline">{{ tree.title }}</div>
      </NuxtLink>
      <div class="mt-3 flex items-center gap-3">
        <CompletionBar :ids="ids" class="flex-1" />
        <CompletionText :ids="ids" class="text-[11px]" />
      </div>
    </div>
    <div class="thin-scrollbar flex-1 overflow-y-auto px-3 py-3">
      <template v-for="c in tree?.children ?? []" :key="c.id">
        <NavLessonLink v-if="c.kind === 'lesson'" :node="c" :active="c.id === currentId" />
        <NavGroup v-else :node="c" :current-id="currentId" />
      </template>

      <div class="label mt-8 mb-2 px-2">Все разделы</div>
      <div class="space-y-px pb-6">
        <NuxtLink
          v-for="s in sections"
          :key="s.id"
          :to="s.href"
          :class="
            cn(
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
              s.id === tree?.id && 'text-foreground',
            )
          "
        >
          <span class="w-5 font-mono text-[10px] text-faint">{{ s.num }}</span>
          {{ s.title }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
