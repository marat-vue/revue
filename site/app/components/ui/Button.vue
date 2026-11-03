<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { buttonVariants, type ButtonVariants } from "~/utils/button-variants";

const props = withDefaults(
  defineProps<PrimitiveProps & { variant?: ButtonVariants["variant"]; size?: ButtonVariants["size"]; class?: HTMLAttributes["class"] }>(),
  { as: "button" },
);
</script>

<template>
  <Primitive data-slot="button" :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class)">
    <slot />
  </Primitive>
</template>
