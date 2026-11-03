<script setup lang="ts">
useHead({
  title: "Песочница",
  meta: [{ name: "description", content: "Онлайн-песочница: HTML/CSS, JavaScript, TypeScript, React, Vue и canvas с файлами в браузере." }],
});
</script>

<template>
  <main class="flex h-[calc(100dvh-3.5rem)] min-h-[520px] flex-col">
    <!-- редактор и бандлер работают только в браузере и грузятся отдельным чанком -->
    <ClientOnly>
      <LazySandboxApp />
      <template #fallback>
        <div class="label flex flex-1 items-center justify-center">Загрузка песочницы…</div>
      </template>
    </ClientOnly>
  </main>
</template>
