<script setup lang="ts">
import type { ReviewScopes } from "#shared/types/content";

useHead({ title: "Повторение" });
const { data: scopes } = await useFetch<ReviewScopes>("/api/scopes", { key: "scopes" });
</script>

<template>
  <ReviewSession :scopes="scopes ?? {}" />
</template>
