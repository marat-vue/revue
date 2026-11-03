<script setup lang="ts">
/** Тонкая линия прогресса чтения под шапкой. */
const bar = ref<HTMLDivElement | null>(null);
let raf = 0;

const update = () => {
  raf = 0;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
  if (bar.value) bar.value.style.transform = `scaleX(${p})`;
};
const onScroll = () => {
  if (!raf) raf = requestAnimationFrame(update);
};

onMounted(() => {
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  cancelAnimationFrame(raf);
});
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-14 z-40 h-px">
    <div ref="bar" class="h-full origin-left scale-x-0 bg-foreground" />
  </div>
</template>
