<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { buttonVariants, type ButtonVariants } from "~/utils/button-variants";

/** Ссылка в виде кнопки. */
const props = defineProps<{ to: string; variant?: ButtonVariants["variant"]; size?: ButtonVariants["size"]; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NuxtLink :to="to" :class="cn(buttonVariants({ variant, size }), props.class)"><slot /></NuxtLink>
</template>
