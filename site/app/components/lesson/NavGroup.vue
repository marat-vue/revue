<script setup lang="ts">
import { ChevronRightIcon } from "lucide-vue-next";
import type { NavNode } from "#shared/types/content";

const props = defineProps<{ node: NavNode; currentId: string }>();

const hasCurrent = computed(() => navContains(props.node, props.currentId));
const open = ref(hasCurrent.value);
// при переходе на урок внутри темы раскрываем её
watch(hasCurrent, (has) => has && (open.value = true));
const ids = computed(() => navIds(props.node));
</script>

<template>
  <div>
    <button
      class="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted/60"
      :aria-expanded="open"
      @click="open = !open"
    >
      <ChevronRightIcon :class="cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-90')" />
      <span class="font-mono text-[10px] text-faint">{{ node.num }}</span>
      <span class="min-w-0 flex-1 truncate">{{ node.title }}</span>
      <CompletionText :ids="ids" class="text-[10px] text-muted-foreground" />
    </button>
    <!-- свёрнутые темы не рендерим вовсе — так статический HTML каждой страницы в разы легче -->
    <div v-if="open" class="ml-[13px] animate-in space-y-px border-l py-1 pl-2 duration-200 fade-in-0 slide-in-from-top-1">
      <template v-for="c in node.children" :key="c.id">
        <NavLessonLink v-if="c.kind === 'lesson'" :node="c" :active="c.id === currentId" />
        <NavGroup v-else :node="c" :current-id="currentId" />
      </template>
    </div>
  </div>
</template>
