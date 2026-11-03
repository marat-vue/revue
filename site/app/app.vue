<script setup lang="ts">
import { TooltipProvider } from "reka-ui";

useHead({ titleTemplate: (title) => (!title || title === BRAND.title ? BRAND.title : `${title} · ${BRAND.name}`) });
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <SiteHeader />
    <div class="flex flex-1 flex-col">
      <NuxtPage />
    </div>
    <CommandMenu />
    <Toaster />
    <PwaRegister />
  </TooltipProvider>
</template>
