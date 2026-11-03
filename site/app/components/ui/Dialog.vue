<script setup lang="ts">
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden } from "reka-ui";
import type { HTMLAttributes } from "vue";

/** Модальное окно в стиле shadcn. Заголовок и описание можно скрыть визуально (srOnlyHeader). */
const props = defineProps<{ title: string; description?: string; class?: HTMLAttributes["class"]; srOnlyHeader?: boolean }>();
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogContent
        data-slot="dialog-content"
        :class="
          cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            props.class,
          )
        "
      >
        <VisuallyHidden v-if="srOnlyHeader">
          <DialogTitle>{{ title }}</DialogTitle>
          <DialogDescription v-if="description">{{ description }}</DialogDescription>
        </VisuallyHidden>
        <div v-else class="flex flex-col gap-2">
          <DialogTitle class="font-heading text-base leading-none font-medium">{{ title }}</DialogTitle>
          <DialogDescription v-if="description" class="text-sm text-muted-foreground">{{ description }}</DialogDescription>
        </div>
        <slot />
        <div v-if="$slots.footer" class="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
