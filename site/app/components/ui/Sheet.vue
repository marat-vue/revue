<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, VisuallyHidden } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { XIcon } from "lucide-vue-next";

/**
 * Выезжающая панель. Кнопка-триггер передаётся слотом trigger, содержимое — слотом по умолчанию.
 * srTitle — заголовок только для скринридеров.
 */
const props = withDefaults(
  defineProps<{ side?: "left" | "right"; class?: HTMLAttributes["class"]; title: string; titleClass?: string; srTitle?: boolean }>(),
  { side: "right" },
);
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/10 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogContent
        data-slot="sheet-content"
        :data-side="side"
        :aria-describedby="undefined"
        :class="
          cn(
            'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg duration-200 ease-in-out outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
            'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-open:slide-in-from-left-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=left]:sm:max-w-sm',
            'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-open:slide-in-from-right-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=right]:sm:max-w-sm',
            props.class,
          )
        "
      >
        <VisuallyHidden v-if="srTitle" as-child><DialogTitle>{{ title }}</DialogTitle></VisuallyHidden>
        <DialogTitle v-else :class="cn('font-heading text-base font-medium text-foreground', titleClass)">{{ title }}</DialogTitle>
        <slot :close="() => (open = false)" />
        <DialogClose as-child>
          <Button variant="ghost" size="icon-sm" class="absolute top-3 right-3">
            <XIcon />
            <span class="sr-only">Закрыть</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
