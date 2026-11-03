<script setup lang="ts">
import { ArrowUpRightIcon, BrainIcon, LoaderIcon, Undo2Icon, XIcon } from "lucide-vue-next";
import type { CardContent, ReviewScopes } from "#shared/types/content";
import { useAppStore } from "~/stores/app";
import { formatInterval, fromCard, GRADES, scheduler, State, toCard, type Grade, type StoredCard } from "~/utils/srs";

import { buildReviewQueue, LEARN_AHEAD } from "~/utils/review-queue";

interface UndoEntry {
  id: string;
  prev: StoredCard;
  rating: Grade;
  wasNew: boolean;
  at: number;
  queue: string[];
}

const STATE_LABEL: Record<number, string> = {
  [State.New]: "Новая",
  [State.Learning]: "Изучение",
  [State.Review]: "Повторение",
  [State.Relearning]: "Переучивание",
};

const props = defineProps<{ scopes: ReviewScopes }>();
const route = useRoute();
const base = useBasePath();
const scope = computed(() => (typeof route.query.scope === "string" ? route.query.scope : null));
const scopeInfo = computed(() => (scope.value ? props.scopes[scope.value] : null));

const store = useAppStore();
const cardsCount = computed(() => Object.keys(store.srs.cards).length);
// при пустой колоде почти мегабайтный cards.json не нужен вовсе
const deckEmpty = computed(() => store.hydrated && cardsCount.value === 0);
const { data: contents, error: loadError, retry } = useCards(() => store.hydrated && !deckEmpty.value);

const byId = computed(() => new Map<string, CardContent>(contents.value?.map((c) => [c.id, c]) ?? []));

const queue = ref<string[] | null>(null);
const revealed = ref(false);
const undo = ref<UndoEntry[]>([]);
const stats = ref({ done: 0, again: 0, started: 0, last: 0 });

const inScope = (id: string) => {
  const c = byId.value.get(id);
  return Boolean(c) && (!scope.value || c!.anc.includes(scope.value));
};

function build(fresh = false, newLimit?: number) {
  const now = Date.now();
  if (fresh) stats.value = { done: 0, again: 0, started: now, last: now };
  const entries = Object.entries(store.srs.cards).filter(([id]) => inScope(id));
  queue.value = buildReviewQueue(entries, now, newLimit ?? store.newLeftToday(now));
  revealed.value = false;
}

// первичная сборка очереди, когда загружены карточки и состояние из localStorage
watch(
  () => [store.hydrated, contents.value] as const,
  ([hydrated, loaded]) => {
    if (hydrated && loaded && queue.value === null) build(true);
  },
  { immediate: true },
);
// смена области (?scope=) — новая сессия
watch(scope, () => {
  if (store.hydrated && contents.value) {
    undo.value = [];
    build(true);
  }
});

const currentId = computed(() => queue.value?.[0]);
const current = computed(() => (currentId.value ? byId.value.get(currentId.value) : undefined));
const currentCard = computed(() => (currentId.value ? store.srs.cards[currentId.value] : undefined));

const f = computed(() => scheduler(store.settings));

const previews = computed(() => {
  if (!currentCard.value || !revealed.value) return null;
  const now = new Date();
  const rec = f.value.repeat(toCard(currentCard.value), now);
  return Object.fromEntries(GRADES.map((g) => [g.grade, formatInterval(rec[g.grade].card.due.getTime() - now.getTime())]));
});

function grade(g: Grade) {
  const q = queue.value;
  const id = currentId.value;
  if (!q || !id) return;
  const prev = store.srs.cards[id];
  if (!prev) return;
  const now = new Date();
  const res = f.value.next(toCard(prev), now, g);
  const next = fromCard(res.card, prev.addedAt);
  const wasNew = prev.state === State.New;
  store.answer({ id, card: next, rating: g, wasNew, at: now.getTime() });
  undo.value = [...undo.value.slice(-30), { id, prev: { ...prev }, rating: g, wasNew, at: now.getTime(), queue: q }];
  stats.value = { ...stats.value, done: stats.value.done + 1, again: stats.value.again + (g === 1 ? 1 : 0), last: now.getTime() };

  const rest = q.slice(1);
  if (next.due - now.getTime() < LEARN_AHEAD) {
    // карточка в шагах изучения — покажем её снова в этой же сессии
    rest.splice(Math.min(rest.length, g === 1 ? 3 : 6), 0, id);
  }
  queue.value = rest;
  revealed.value = false;
}

function doUndo() {
  const last = undo.value.at(-1);
  if (!last) return;
  store.undoAnswer({ id: last.id, card: last.prev, rating: last.rating, wasNew: last.wasNew, at: last.at });
  undo.value = undo.value.slice(0, -1);
  queue.value = last.queue;
  stats.value = {
    ...stats.value,
    done: Math.max(0, stats.value.done - 1),
    again: Math.max(0, stats.value.again - (last.rating === 1 ? 1 : 0)),
  };
  revealed.value = true;
}

const onKey = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement)?.closest("input, textarea, [role=dialog]")) return;
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
    e.preventDefault();
    doUndo();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || !current.value) return;
  if (!revealed.value && (e.code === "Space" || e.key === "Enter")) {
    e.preventDefault();
    revealed.value = true;
  } else if (revealed.value) {
    const g = GRADES.find((x) => x.key === e.key);
    if (g) grade(g.grade);
    else if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      grade(3 as Grade);
    }
  }
};
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));

/* ──────────── подсчёты ──────────── */

const counts = computed(() => {
  const c = { new: 0, learn: 0, review: 0 };
  for (const id of new Set(queue.value ?? [])) {
    const st = store.srs.cards[id]?.state;
    if (st === State.New) c.new++;
    else if (st === State.Review) c.review++;
    else c.learn++;
  }
  return c;
});

const remainingNew = computed(
  () => Object.entries(store.srs.cards).filter(([id, c]) => c.state === State.New && inScope(id) && !queue.value?.includes(id)).length,
);
const deckSize = computed(() => Object.keys(store.srs.cards).filter(inScope).length);

const now = useNow();
const nextDue = computed(() => {
  const upcoming = Object.entries(store.srs.cards)
    .filter(([id, c]) => inScope(id) && c.state !== State.New && c.due > now.value)
    .map(([, c]) => c.due)
    .sort((a, b) => a - b);
  if (!upcoming.length) return null;
  const first = upcoming[0]!;
  const day = new Date(first).toDateString();
  return { at: first, count: upcoming.filter((d) => new Date(d).toDateString() === day).length };
});

const total = computed(() => stats.value.done + (queue.value?.length ?? 0));
const pct = computed(() => (total.value ? stats.value.done / total.value : 0));

const summary = computed(() => {
  const s = stats.value;
  const acc = s.done ? Math.round(((s.done - s.again) / s.done) * 100) : null;
  const minutes = Math.max(1, Math.round((s.last - s.started) / 60000));
  return [
    [s.done, plural(s.done, ["карточка", "карточки", "карточек"])],
    [acc !== null ? `${acc}%` : "–", "верных ответов"],
    [minutes, plural(minutes, ["минута", "минуты", "минут"])],
  ] as const;
});

const nextDueText = computed(() =>
  nextDue.value
    ? `Следующее повторение — ${new Date(nextDue.value.at).toLocaleString("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}, ${nextDue.value.count} ${plural(nextDue.value.count, ["карточка", "карточки", "карточек"])}.`
    : "Новых повторений пока не запланировано.",
);

function moreNew() {
  build(false, 10);
}

type Phase = "error" | "loading" | "empty" | "done" | "card";
const phase = computed<Phase>(() => {
  if (loadError.value && !deckEmpty.value) return "error";
  if (!store.hydrated || (!deckEmpty.value && (!contents.value || queue.value === null))) return "loading";
  if (deckEmpty.value || deckSize.value === 0) return "empty";
  if (!current.value || !currentCard.value) return "done";
  return "card";
});
</script>

<template>
  <main v-if="phase === 'error'" class="grid flex-1 place-items-center px-4">
    <div class="text-center">
      <div class="label">Ошибка загрузки</div>
      <p class="mt-3 text-muted-foreground">Не удалось загрузить карточки. Проверьте соединение и попробуйте ещё раз.</p>
      <Button size="lg" variant="outline" class="mt-6 px-5" @click="retry">Повторить</Button>
    </div>
  </main>

  <main v-else-if="phase === 'loading'" class="grid flex-1 place-items-center">
    <LoaderIcon class="size-5 animate-spin text-muted-foreground" />
  </main>

  <main v-else :class="cn('flex-1', phase === 'card' && 'flex flex-col')">
    <!-- шапка сессии -->
    <div class="border-b">
      <div class="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <BrainIcon class="size-4 shrink-0" />
          <span class="truncate text-sm font-medium">{{ scopeInfo ? scopeInfo.title : "Все карточки" }}</span>
          <NuxtLink v-if="scopeInfo" to="/review/" class="text-muted-foreground hover:text-foreground" aria-label="Сбросить фильтр">
            <XIcon class="size-3.5" />
          </NuxtLink>
        </div>
        <div class="ml-auto flex items-center gap-4 font-mono text-[11px] tracking-wider uppercase">
          <span title="Новые"><span class="text-muted-foreground">нов </span><span class="tabular-nums">{{ counts.new }}</span></span>
          <span title="Изучение"><span class="text-muted-foreground">изуч </span><span class="tabular-nums">{{ counts.learn }}</span></span>
          <span title="Повторение"><span class="text-muted-foreground">повт </span><span class="tabular-nums">{{ counts.review }}</span></span>
          <Button variant="ghost" size="icon-sm" :disabled="!undo.length" aria-label="Отменить последний ответ (Ctrl+Z)" @click="doUndo"><Undo2Icon /></Button>
        </div>
      </div>
      <div class="h-px bg-border">
        <div class="h-full bg-foreground transition-[width] duration-500" :style="{ width: `${pct * 100}%` }" />
      </div>
    </div>

    <!-- колода пуста -->
    <div v-if="phase === 'empty'" class="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <div class="label">Колода пуста</div>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Пока нечего повторять</h1>
      <p class="mx-auto mt-5 max-w-lg leading-relaxed text-muted-foreground">
        Каждый урок превращается в карточку: на лицевой стороне — вопрос, на обороте — краткий ответ. Отметьте урок изученным или нажмите «В
        повторение». Можно добавить и целый раздел сразу.
      </p>
      <ButtonLink to="/" size="lg" class="mt-8 px-5">Выбрать раздел</ButtonLink>
    </div>

    <!-- сессия завершена -->
    <div v-else-if="phase === 'done'" class="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
      <div class="label animate-rise">{{ stats.done ? "Сессия завершена" : "На сегодня всё" }}</div>
      <h1 class="mt-4 animate-rise text-6xl font-semibold tracking-[-0.05em] sm:text-8xl">Готово.</h1>
      <div v-if="stats.done > 0" class="mt-12 grid animate-rise grid-cols-3 border-y [animation-delay:100ms]">
        <div v-for="([v, l], i) in summary" :key="i" class="border-l py-6 pl-5 first:border-l-0 first:pl-0">
          <div class="font-mono text-4xl font-light tracking-tighter tabular-nums">{{ v }}</div>
          <div class="label mt-2">{{ l }}</div>
        </div>
      </div>
      <p class="mt-10 animate-rise text-muted-foreground [animation-delay:160ms]">{{ nextDueText }}</p>
      <div class="mt-8 flex animate-rise flex-wrap gap-2 [animation-delay:200ms]">
        <Button v-if="remainingNew > 0" size="lg" class="px-5" @click="moreNew">Ещё {{ Math.min(10, remainingNew) }} новых</Button>
        <ButtonLink :to="scopeInfo?.href ?? '/'" size="lg" variant="outline" class="px-5">{{ scopeInfo ? "К разделу" : "К разделам" }}</ButtonLink>
        <ButtonLink to="/stats/" size="lg" variant="ghost" class="px-5">Статистика</ButtonLink>
      </div>
    </div>

    <!-- карточка -->
    <div v-else-if="current && currentCard" class="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <article :key="`${currentId}-${stats.done}`" class="animate-rise">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase">{{ STATE_LABEL[currentCard.state] }}</span>
          <span class="label truncate">{{ current.path }}</span>
        </div>
        <h1 class="mt-5 text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{{ current.title }}</h1>
        <div v-if="current.q" class="prose prose-card mt-5 text-muted-foreground" v-html="current.q" />

        <button
          v-if="!revealed"
          class="group mt-12 flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground transition-colors hover:border-foreground hover:text-foreground sm:flex-row sm:py-10"
          @click="revealed = true"
        >
          Вспомните ответ и откройте карточку
          <Kbd class="hidden sm:inline-flex">Space</Kbd>
        </button>
        <div v-else class="mt-10 animate-rise [animation-duration:0.4s]">
          <div class="flex items-center gap-4">
            <span class="label">Ответ</span>
            <span class="h-px flex-1 bg-border" />
            <a :href="`${base}${current.href}`" target="_blank" rel="noreferrer" class="label flex items-center gap-1 hover:text-foreground">
              Урок целиком <ArrowUpRightIcon class="size-3" />
            </a>
          </div>
          <div class="prose prose-card mt-5" v-html="current.a" />
        </div>
      </article>

      <div class="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background to-transparent pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div v-if="revealed && previews" class="grid animate-rise grid-cols-4 gap-px overflow-hidden rounded-lg border bg-border [animation-duration:0.35s]">
          <button
            v-for="g in GRADES"
            :key="g.grade"
            :class="cn('group flex flex-col items-center gap-1 bg-background px-2 py-4 transition-colors hover:bg-foreground hover:text-background', g.grade === 3 && 'bg-muted/60')"
            @click="grade(g.grade)"
          >
            <span class="font-mono text-[11px] text-muted-foreground tabular-nums group-hover:text-background/60">{{ previews[g.grade] }}</span>
            <span class="text-sm font-medium sm:text-base">{{ g.label }}</span>
            <span class="hidden font-mono text-[10px] text-faint group-hover:text-background/50 sm:block">{{ g.key }}</span>
          </button>
        </div>
        <div class="mt-4 hidden justify-center gap-5 font-mono text-[10px] tracking-wider text-faint uppercase sm:flex">
          <span>Space — {{ revealed ? "хорошо" : "показать" }}</span>
          <span>1–4 — оценка</span>
          <span>Ctrl+Z — отменить</span>
        </div>
      </div>
    </div>
  </main>
</template>
