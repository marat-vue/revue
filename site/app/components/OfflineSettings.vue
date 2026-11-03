<script setup lang="ts">
import { toast } from "vue-sonner";
import { CheckIcon, CloudDownloadIcon, MonitorDownIcon, Trash2Icon, XIcon } from "lucide-vue-next";

interface OfflineSection {
  key: string;
  title: string;
  /** страницы уроков и папок раздела — всё, что открывается при чтении */
  hrefs: string[];
}

const mb = (bytes: number) => `${Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} МБ`;

/** Все страницы раздела: уроки + промежуточные папки (/l/03/, /l/03/06/). */
const index = useSearchIndex();
const sections = computed<OfflineSection[] | null>(() => {
  if (!index.value) return null;
  const map = new Map<string, OfflineSection>();
  for (const entry of index.value) {
    const parts = entry.href.split("/").filter(Boolean); // ["l", "03", "06", "04"]
    const key = parts.slice(0, 2).join("/");
    const section = map.get(key) ?? { key, title: entry.section, hrefs: [] };
    for (let i = 2; i <= parts.length; i++) {
      const href = `/${parts.slice(0, i).join("/")}/`;
      if (!section.hrefs.includes(href)) section.hrefs.push(href);
    }
    map.set(key, section);
  }
  return [...map.values()];
});

const { canInstall, installed, install } = useInstallPrompt();
const supported = offlineSupported();
const base = useBasePath();
const saved = shallowRef<Set<string> | null>(null);
const usage = ref<number | null>(null);
const job = ref<{ label: string; done: number; total: number } | null>(null);
const swActive = ref<boolean | null>(null);
let abort: AbortController | null = null;

async function refresh() {
  if (!supported) return;
  const [hrefs, estimate, registration] = await Promise.all([cachedHrefs(base), storageEstimate(), navigator.serviceWorker.getRegistration()]);
  saved.value = hrefs;
  usage.value = estimate?.usage ?? null;
  swActive.value = Boolean(registration?.active);
}
const refreshSafely = () => refresh().catch(() => toast.error("Не удалось прочитать офлайн-хранилище браузера"));
onMounted(refreshSafely);
onBeforeUnmount(() => abort?.abort());

const allHrefs = computed(() => sections.value?.flatMap((s) => s.hrefs) ?? []);
const savedCount = computed(() => (saved.value ? allHrefs.value.filter((h) => saved.value!.has(h)).length : 0));

async function download(hrefs: string[], label: string) {
  if (job.value) return;
  const persisted = await requestPersistentStorage();
  const controller = new AbortController();
  abort = controller;
  job.value = { label, done: 0, total: hrefs.length };
  try {
    const { failed } = await downloadPages(hrefs, {
      base,
      signal: controller.signal,
      onProgress: (done) => (job.value = { label, done, total: hrefs.length }),
    });
    if (controller.signal.aborted) toast("Загрузка остановлена");
    else if (failed) toast.error(`Не удалось сохранить страниц: ${failed}. Проверьте подключение и повторите.`);
    else toast.success(`«${label}» доступно офлайн`, { description: persisted ? undefined : "Браузер может удалить данные при нехватке места." });
  } catch {
    toast.error("Не удалось сохранить раздел. Проверьте свободное место и подключение.");
  } finally {
    abort = null;
    job.value = null;
    void refreshSafely();
  }
}

async function clear() {
  if (!confirm("Удалить все сохранённые для офлайна страницы? Прогресс и карточки не пострадают.")) return;
  try {
    await clearOfflinePages();
    toast("Офлайн-данные удалены");
    void refreshSafely();
  } catch {
    toast.error("Не удалось очистить офлайн-хранилище браузера");
  }
}

const sectionState = (s: OfflineSection) => {
  const have = saved.value ? s.hrefs.filter((h) => saved.value!.has(h)).length : 0;
  return { have, complete: have === s.hrefs.length };
};
</script>

<template>
  <SettingsRow v-if="!supported" title="Офлайн-режим" desc="Этот браузер не поддерживает service worker — офлайн-режим недоступен." wide>
    <span class="text-sm text-muted-foreground">Недоступно</span>
  </SettingsRow>

  <template v-else>
    <SettingsRow
      title="Установить приложение"
      :desc="
        installed
          ? 're:vue уже запущен как приложение.'
          : 'Отдельное окно без вкладок браузера, иконка на рабочем столе или главном экране. В Safari на iPhone: «Поделиться» → «На экран Домой».'
      "
      wide
    >
      <span v-if="installed" class="inline-flex items-center gap-1.5 text-sm"><CheckIcon class="size-4" /> Установлено</span>
      <Button v-else variant="outline" :disabled="!canInstall" @click="install">
        <MonitorDownIcon /> {{ canInstall ? "Установить" : "Через меню браузера" }}
      </Button>
    </SettingsRow>

    <SettingsRow title="Офлайн-доступ" wide>
      <template #desc>
        Главная, повторение карточек, статистика и все открытые уроки сохраняются автоматически. Разделы целиком можно скачать заранее.
        <span v-if="swActive === false" class="mt-1 block">Service worker ещё не активен — обновите страницу.</span>
      </template>
      <div class="w-full space-y-3">
        <div class="flex items-baseline justify-between gap-4 font-mono text-[12px] text-muted-foreground">
          <span>
            Сохранено <span class="text-foreground tabular-nums">{{ saved ? savedCount : "–" }}</span> из {{ allHrefs.length || "–" }} стр.
          </span>
          <span v-if="usage !== null">занято {{ mb(usage) }}</span>
        </div>
        <div v-if="job" class="space-y-2">
          <div class="h-1 overflow-hidden rounded-full bg-muted">
            <div class="h-full bg-foreground transition-[width]" :style="{ width: `${(job.done / job.total) * 100}%` }" />
          </div>
          <div class="flex items-center justify-between text-[12px] text-muted-foreground">
            <span class="truncate">{{ job.label }}: {{ job.done }} / {{ job.total }}</span>
            <Button size="sm" variant="ghost" @click="abort?.abort()"><XIcon /> Остановить</Button>
          </div>
        </div>
        <div v-else class="flex flex-wrap gap-2 md:justify-end">
          <Button :disabled="!sections || savedCount === allHrefs.length" @click="download(allHrefs, 'Все разделы')">
            <CloudDownloadIcon /> Скачать всё ≈ {{ mb((allHrefs.length - savedCount) * PAGE_SIZE_ESTIMATE) }}
          </Button>
          <Button variant="outline" :disabled="!saved?.size" @click="clear"><Trash2Icon /> Очистить</Button>
        </div>
      </div>
    </SettingsRow>

    <div v-if="sections" class="grid gap-px border-b bg-border sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="s in sections" :key="s.key" class="flex items-center gap-3 bg-background px-1 py-3 sm:px-3">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{{ s.title }}</div>
          <div class="font-mono text-[11px] text-muted-foreground tabular-nums">{{ sectionState(s).have }}/{{ s.hrefs.length }} стр. · ≈ {{ mb(s.hrefs.length * PAGE_SIZE_ESTIMATE) }}</div>
        </div>
        <button
          type="button"
          :disabled="Boolean(job) || sectionState(s).complete"
          :title="sectionState(s).complete ? 'Раздел сохранён' : 'Скачать раздел для офлайна'"
          :aria-label="sectionState(s).complete ? `${s.title}: сохранён` : `Скачать раздел «${s.title}»`"
          :class="
            cn(
              'grid size-8 shrink-0 place-items-center rounded-md border transition-colors',
              sectionState(s).complete
                ? 'border-foreground bg-foreground text-background'
                : 'text-muted-foreground hover:border-foreground/40 hover:text-foreground disabled:opacity-40',
            )
          "
          @click="download(s.hrefs, s.title)"
        >
          <CheckIcon v-if="sectionState(s).complete" class="size-4" />
          <CloudDownloadIcon v-else class="size-4" />
        </button>
      </div>
    </div>
  </template>
</template>
