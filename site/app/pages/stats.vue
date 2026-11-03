<script setup lang="ts">
import type { StatsData } from "#shared/types/content";
import { useAppStore } from "~/stores/app";
import { State } from "~/utils/srs";

useHead({ title: "Статистика" });
const { data } = await useFetch<StatsData>("/api/stats", { key: "stats" });

const WEEKS = 53;
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const LEVELS = ["bg-muted", "bg-foreground/25", "bg-foreground/50", "bg-foreground/75", "bg-foreground"];

const store = useAppStore();
const due = useDueSummary();
const total = computed(() => data.value?.total ?? 0);

const stats = computed(() => {
  const { srs, progress } = store;
  const activity = activityByDay(srs, progress);
  const cards = Object.values(srs.cards);
  const states = { [State.New]: 0, [State.Learning]: 0, [State.Review]: 0, [State.Relearning]: 0 } as Record<number, number>;
  for (const c of cards) states[c.state] = (states[c.state] ?? 0) + 1;
  let reviews = 0;
  let again = 0;
  for (const d of Object.values(srs.days)) {
    reviews += d.r;
    again += d.a;
  }
  const completed = Object.values(progress.lessons).filter((p) => p.c).length;
  const mature = cards.filter((c) => c.state === State.Review && c.scheduled_days >= 21).length;

  // календарь активности: WEEKS недель, начиная с понедельника
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const dow = (today.getDay() + 6) % 7;
  start.setDate(today.getDate() - dow - (WEEKS - 1) * 7);
  const weeks: { key: string; count: number; future: boolean; date: Date }[][] = [];
  let max = 0;
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(date.getTime());
      const count = activity.get(key) ?? 0;
      max = Math.max(max, count);
      col.push({ key, count, future: date > today, date });
    }
    weeks.push(col);
  }

  // прогноз на 14 дней
  const forecast: { label: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const count = cards.filter((c) => c.state !== State.New && (i === 0 ? c.due <= end.getTime() : c.due >= d.getTime() && c.due <= end.getTime())).length;
    forecast.push({ label: i === 0 ? "сег" : String(d.getDate()), count });
  }

  return { streak: streak(activity), states, reviews, again, completed, mature, weeks, max, forecast, deck: cards.length };
});

const v = (x: string | number) => (store.hydrated ? x : "–");
const retention = computed(() => (stats.value.reviews ? Math.round(((stats.value.reviews - stats.value.again) / stats.value.reviews) * 100) : null));
const fMax = computed(() => Math.max(1, ...stats.value.forecast.map((f) => f.count)));
const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / Math.max(1, stats.value.max)) * 4)));

const big = computed(() => {
  const s = stats.value;
  return [
    { label: "Изучено уроков", value: v(s.completed), sub: `из ${total.value} · ${total.value ? Math.round((s.completed / total.value) * 100) : 0}%` },
    { label: "Карточек в колоде", value: v(s.deck), sub: `${s.mature} ${plural(s.mature, ["зрелая", "зрелые", "зрелых"])} (интервал ≥ 21 д)` },
    { label: "К повторению сегодня", value: v(due.value.total), sub: `${due.value.review + due.value.learning} повт. · ${due.value.newToday} нов.` },
    { label: "Серия", value: v(s.streak), sub: plural(s.streak, ["день подряд", "дня подряд", "дней подряд"]) },
    { label: "Всего повторений", value: v(s.reviews) },
    { label: "Верных ответов", value: v(retention.value !== null ? `${retention.value}%` : "–"), sub: "доля ответов кроме «Снова»" },
    { label: "Новые / изучение", value: v(`${s.states[State.New]}/${(s.states[State.Learning] ?? 0) + (s.states[State.Relearning] ?? 0)}`) },
    { label: "На повторении", value: v(s.states[State.Review] ?? 0) },
  ];
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-6 sm:py-16">
    <div class="label">Ваш прогресс</div>
    <h1 class="mt-3 text-5xl font-semibold tracking-[-0.045em] sm:text-7xl">Статистика</h1>

    <div class="mt-12 grid border-t border-l sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="b in big" :key="b.label" class="border-r border-b p-6">
        <div class="label">{{ b.label }}</div>
        <div class="mt-4 font-mono text-4xl font-light tracking-tighter tabular-nums sm:text-5xl">{{ b.value }}</div>
        <div v-if="b.sub" class="mt-1 text-xs text-muted-foreground">{{ b.sub }}</div>
      </div>
    </div>

    <!-- ─────────── Календарь активности ─────────── -->
    <section class="mt-16">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">Активность</h2>
        <span class="label">Последние 12 месяцев</span>
      </div>
      <div class="thin-scrollbar mt-6 overflow-x-auto rounded-lg border p-5">
        <!-- даты зависят от часового пояса и дня открытия, поэтому календарь строится только в браузере -->
        <ClientOnly>
        <!-- колонки резиновые: календарь занимает всю ширину карточки, на узких экранах — скролл -->
        <div class="grid min-w-[640px] gap-[3px]" :style="{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }">
          <div v-for="(col, i) in stats.weeks" :key="i" class="flex min-w-0 flex-col gap-[3px]">
            <!-- подпись не влияет на ширину колонки -->
            <div class="relative h-4">
              <span class="absolute top-0 left-0 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {{ col[0]!.date.getDate() <= 7 ? MONTHS[col[0]!.date.getMonth()] : "" }}
              </span>
            </div>
            <div
              v-for="d in col"
              :key="d.key"
              :title="`${d.date.toLocaleDateString('ru')}: ${d.count}`"
              :class="cn('aspect-square w-full rounded-[2px] transition-colors', d.future ? 'bg-transparent' : !store.hydrated ? 'bg-muted' : LEVELS[level(d.count)])"
            />
          </div>
        </div>
          <template #fallback><div class="aspect-[53/8] min-w-[640px]" /></template>
        </ClientOnly>
        <div class="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-muted-foreground">
          меньше
          <span v-for="c in LEVELS" :key="c" :class="cn('size-[11px] rounded-[2px]', c)" />
          больше
        </div>
      </div>
    </section>

    <!-- ─────────── Прогноз ─────────── -->
    <section class="mt-16">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">Прогноз повторений</h2>
        <span class="label">14 дней</span>
      </div>
      <div class="mt-6 flex h-48 items-end gap-1 rounded-lg border p-3 sm:gap-2 sm:p-5">
        <ClientOnly>
        <div v-for="(f, i) in stats.forecast" :key="i" class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span class="font-mono text-[10px] text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100">{{ store.hydrated ? f.count : "" }}</span>
          <div
            :class="cn('w-full rounded-t-[2px] transition-[height] duration-700', i === 0 ? 'bg-foreground' : 'bg-foreground/35')"
            :style="{ height: store.hydrated ? `${(f.count / fMax) * 100}%` : 0, minHeight: f.count && store.hydrated ? '2px' : 0 }"
          />
          <span class="font-mono text-[10px] text-muted-foreground">{{ f.label }}</span>
        </div>
        </ClientOnly>
      </div>
    </section>

    <!-- ─────────── По разделам ─────────── -->
    <section class="mt-16">
      <h2 class="text-2xl font-semibold tracking-tight">По разделам</h2>
      <div class="mt-6 border-t">
        <NuxtLink
          v-for="s in data?.sections ?? []"
          :key="s.id"
          :to="s.href"
          class="group grid grid-cols-[2.5rem_1fr_4rem] items-center gap-4 border-b py-4 hover:bg-muted/40 sm:grid-cols-[2.5rem_16rem_1fr_4rem]"
        >
          <span class="font-mono text-xs text-faint">{{ s.num }}</span>
          <span class="truncate font-medium">{{ s.title }}</span>
          <CompletionBar :ids="s.ids" class="hidden h-[3px] sm:block" />
          <CompletionPct :ids="s.ids" class="text-right text-sm" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
