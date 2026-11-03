<script setup lang="ts">
import type { PageData } from "#shared/types/content";

// каждый урок монтируется заново: подсветка кода, живые примеры и навигация инициализируются с нуля
definePageMeta({ key: (r) => r.path });

const route = useRoute();
const slug = computed(() => ([] as string[]).concat(route.params.slug ?? []).filter(Boolean).join("/"));

const { data, error } = await useFetch<PageData>(() => `/api/page/${slug.value}`, { key: `page:${slug.value}` });
if (error.value || !data.value) throw createError({ statusCode: 404, message: "Не найдено", fatal: true });

useHead({ title: () => (data.value?.kind === "lesson" ? data.value.title : data.value?.node.title) ?? "Не найдено" });

// При SPA-переходе Nuxt запрашивает только payload. Для повторного открытия
// урока по прямой ссылке без сети нужен также HTML, которого service worker не видел.
const base = useBasePath();
onMounted(() => {
  const href = data.value?.node.href;
  if (!import.meta.dev && href && offlineSupported()) void downloadPages([href], { base }).catch(() => {});
});
</script>

<template>
  <LessonView v-if="data?.kind === 'lesson'" :page="data" />
  <FolderView v-else-if="data?.kind === 'folder'" :page="data" />
</template>
