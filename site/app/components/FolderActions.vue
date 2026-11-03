<script setup lang="ts">
import { toast } from "vue-sonner";
import { BrainIcon, CheckCheckIcon, MoreHorizontalIcon, PlusIcon, RotateCcwIcon, Undo2Icon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";

const props = defineProps<{ id: string; ids: string[] }>();
const store = useAppStore();
const completion = useCompletion(() => props.ids);
const inDeck = computed(() => props.ids.filter((i) => store.srs.cards[i]).length);
const missing = computed(() => completion.value.total - inDeck.value);

const addAll = () => {
  const n = missing.value;
  store.addCards(props.ids);
  toast(`${n} ${plural(n, ["карточка добавлена", "карточки добавлены", "карточек добавлено"])} в повторение`);
};

const removeAll = () => {
  store.removeCards(props.ids);
  toast("Карточки раздела убраны из повторения");
};
</script>

<template>
  <div :class="cn('flex flex-wrap items-center gap-2 transition-opacity', !store.hydrated && 'opacity-0')">
    <ButtonLink v-if="inDeck > 0" :to="`/review/?scope=${id}`" size="lg" class="px-4">
      <BrainIcon /> Повторить раздел
      <span class="font-mono text-xs opacity-60">{{ inDeck }}</span>
    </ButtonLink>
    <Button v-else size="lg" class="px-4" @click="addAll"><PlusIcon /> Учить карточками</Button>

    <Menu align="end" class="w-64">
      <template #trigger>
        <Button variant="outline" size="icon-lg" aria-label="Ещё действия"><MoreHorizontalIcon /></Button>
      </template>
      <MenuItem v-if="missing > 0 && inDeck > 0" @select="addAll"><PlusIcon /> Добавить оставшиеся ({{ missing }}) в повторение</MenuItem>
      <MenuItem v-if="completion.done < completion.total" @select="store.setCompleted(ids, true)"><CheckCheckIcon /> Отметить всё изученным</MenuItem>
      <MenuItem v-if="completion.done > 0" @select="store.setCompleted(ids, false)"><Undo2Icon /> Снять отметки «изучено»</MenuItem>
      <template v-if="inDeck > 0">
        <MenuSeparator />
        <MenuItem variant="destructive" @select="removeAll"><RotateCcwIcon /> Убрать раздел из повторения</MenuItem>
      </template>
    </Menu>
  </div>
</template>
