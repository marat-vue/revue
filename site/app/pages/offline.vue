<script setup lang="ts">
/** Service worker показывает эту страницу, если урок не сохранён для офлайна, а сети нет. */
useHead({ title: "Нет подключения", meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <main class="grid flex-1 place-items-center px-4 py-24">
    <div class="max-w-md text-center">
      <div class="font-mono text-[clamp(4rem,14vw,8rem)] leading-none font-extralight tracking-tighter text-muted-foreground/30">offline</div>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Эта страница не сохранена для офлайна</h1>
      <p class="mt-3 text-muted-foreground">
        Без интернета доступны уже открытые уроки, повторение карточек и статистика. Чтобы читать любые разделы без сети, скачайте их в
        настройках.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-2">
        <ButtonLink to="/review/" size="lg" class="px-5">Повторять карточки</ButtonLink>
        <ButtonLink to="/settings/#offline" size="lg" variant="outline" class="px-5">Офлайн-доступ</ButtonLink>
      </div>
    </div>
  </main>
</template>
