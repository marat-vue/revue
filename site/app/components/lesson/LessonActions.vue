<script setup lang="ts">
import { toast } from "vue-sonner";
import { BrainIcon, CheckIcon, CircleIcon, MinusIcon, PlusIcon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";
import { State } from "~/utils/srs";

const props = withDefaults(defineProps<{ id: string; href: string; title: string; variant?: "header" | "footer" }>(), { variant: "header" });
const store = useAppStore();
const done = computed(() => Boolean(store.progress.lessons[props.id]?.c));
const card = computed(() => store.srs.cards[props.id]);

// отмечаем урок открытым, когда состояние уже прочитано из localStorage
watch(
  () => [store.hydrated, props.id] as const,
  ([hydrated]) => {
    if (hydrated && props.variant === "header") store.visit({ id: props.id, href: props.href, title: props.title });
  },
  { immediate: true },
);

const toggleDone = () => {
  const wasDone = done.value;
  store.setCompleted([props.id], !wasDone);
  if (!wasDone && store.settings.autoAdd && !card.value) {
    store.addCards([props.id]);
    toast("Урок изучен", { description: "Карточка добавлена в интервальное повторение" });
  } else if (!wasDone) {
    toast("Урок отмечен изученным");
  }
};

const toggleDeck = () => {
  if (card.value) {
    store.removeCards([props.id]);
    toast("Карточка убрана из повторения");
  } else {
    store.addCards([props.id]);
    toast("Карточка добавлена в повторение");
  }
};

const deckLabel = computed(() => (card.value ? (card.value.state === State.New ? "В колоде · новая" : `Повтор ${relativeDay(card.value.due)}`) : "В повторение"));
</script>

<template>
  <div
    v-if="variant === 'footer'"
    :class="cn('flex flex-col items-start gap-4 transition-opacity sm:flex-row sm:items-center sm:justify-between', !store.hydrated && 'opacity-0')"
  >
    <div>
      <div class="text-lg font-semibold tracking-tight">{{ done ? "Урок изучен" : "Дочитали до конца?" }}</div>
      <div class="mt-1 text-sm text-muted-foreground">
        {{ done ? "Карточка поможет не забыть материал." : "Отметьте урок — прогресс сохранится в браузере." }}
      </div>
    </div>
    <div class="flex w-full flex-wrap gap-2 sm:w-auto">
      <Button size="lg" :variant="done ? 'outline' : 'default'" class="px-4" @click="toggleDone">
        <MinusIcon v-if="done" /><CheckIcon v-else />
        {{ done ? "Снять отметку" : "Отметить изученным" }}
      </Button>
      <Button v-if="!card" size="lg" variant="outline" class="px-4" @click="toggleDeck"><BrainIcon /> В повторение</Button>
    </div>
  </div>

  <div v-else :class="cn('flex flex-wrap items-center gap-2 transition-opacity', !store.hydrated && 'opacity-0')">
    <Button :variant="done ? 'default' : 'outline'" class="rounded-full px-3.5" @click="toggleDone">
      <CheckIcon v-if="done" /><CircleIcon v-else />
      {{ done ? "Изучено" : "Отметить изученным" }}
    </Button>
    <Tooltip>
      <Button variant="outline" class="rounded-full px-3.5" @click="toggleDeck">
        <BrainIcon v-if="card" /><PlusIcon v-else />
        {{ deckLabel }}
      </Button>
      <template #content>{{ card ? "Нажмите, чтобы убрать из колоды" : "Добавить карточку «вопрос → краткий ответ» в FSRS" }}</template>
    </Tooltip>
  </div>
</template>
