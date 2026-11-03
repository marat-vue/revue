<script setup lang="ts">
import type { TocItem } from "#shared/types/content";

const props = defineProps<{ items: TocItem[] }>();
const active = ref<string | null>(null);
let els: HTMLElement[] = [];

const onScroll = () => {
  let cur: string | null = null;
  for (const el of els) {
    if (el.getBoundingClientRect().top < 140) cur = el.id;
    else break;
  }
  active.value = cur;
};

function bind() {
  els = props.items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
  onScroll();
}

onMounted(() => {
  bind();
  window.addEventListener("scroll", onScroll, { passive: true });
});
watch(() => props.items, () => nextTick(bind));
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <nav v-if="items.length" aria-label="Оглавление">
    <div class="label mb-4">На странице</div>
    <ul class="space-y-0.5 border-l">
      <li v-for="i in items" :key="i.id">
        <a
          :href="`#${i.id}`"
          :class="
            cn(
              '-ml-px block border-l py-1 text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground',
              i.depth === 3 ? 'pl-7' : 'pl-4',
              active === i.id ? 'border-foreground text-foreground' : 'border-transparent',
            )
          "
          >{{ i.text }}</a
        >
      </li>
    </ul>
  </nav>
</template>
