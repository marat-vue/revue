<script setup lang="ts">
import { toast } from "vue-sonner";
import { DownloadIcon, Trash2Icon, UploadIcon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";

useHead({ title: "Настройки" });

const store = useAppStore();
const colorMode = useColorMode();
const fileRef = ref<HTMLInputElement | null>(null);
const confirmOpen = ref(false);

const THEMES = [
  ["light", "Светлая"],
  ["dark", "Тёмная"],
  ["system", "Системная"],
] as const;

const exportData = () => {
  const blob = new Blob([JSON.stringify({ app: "redev", version: 1, exportedAt: new Date().toISOString(), ...store.persisted }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `revue-progress-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Резервная копия сохранена");
};

const importData = async (file: File) => {
  try {
    store.hydrate(JSON.parse(await file.text()));
    toast("Прогресс восстановлен из файла");
  } catch {
    toast.error("Не удалось прочитать файл резервной копии");
  }
};

const onFile = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) importData(f);
  input.value = "";
};

const resetAll = () => {
  store.resetAll();
  confirmOpen.value = false;
  toast("Прогресс сброшен");
};
</script>

<template>
  <main :class="cn('mx-auto w-full max-w-4xl flex-1 px-4 py-12 transition-opacity sm:px-6 sm:py-16', !store.hydrated && 'opacity-0')">
    <div class="label">Параметры</div>
    <h1 class="mt-3 text-5xl font-semibold tracking-[-0.045em] sm:text-7xl">Настройки</h1>

    <h2 class="label mt-14">Оформление</h2>
    <div class="border-t">
      <SettingsRow title="Тема" desc="Строгая монохромная палитра — светлая или тёмная.">
        <div class="inline-flex rounded-lg border p-0.5">
          <button
            v-for="[k, l] in THEMES"
            :key="k"
            :class="cn('rounded-md px-3 py-1.5 text-sm transition-colors', colorMode.preference === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')"
            @click="colorMode.preference = k"
          >
            {{ l }}
          </button>
        </div>
      </SettingsRow>
    </div>

    <h2 class="label mt-14">Интервальное повторение · FSRS</h2>
    <div class="border-t">
      <SettingsRow
        title="Желаемая запоминаемость"
        desc="Вероятность вспомнить карточку в момент повторения. Выше — чаще повторения, ниже — реже, но больше забываний. Оптимум обычно 0.85–0.92."
      >
        <SliderField
          :model-value="store.settings.retention"
          :min="0.7"
          :max="0.97"
          :step="0.01"
          :format="(v) => v.toFixed(2)"
          @update:model-value="(v) => store.updateSettings({ retention: Math.round(v * 100) / 100 })"
        />
      </SettingsRow>
      <SettingsRow title="Новых карточек в день" desc="Сколько новых карточек вводить ежедневно. Каждая новая карточка порождает несколько повторений в первые дни.">
        <SliderField :model-value="store.settings.newPerDay" :min="0" :max="100" :step="1" :format="String" @update:model-value="(v) => store.updateSettings({ newPerDay: v })" />
      </SettingsRow>
      <SettingsRow title="Максимальный интервал" desc="Верхняя граница интервала между повторениями, в днях.">
        <SliderField
          :model-value="store.settings.maxInterval"
          :min="30"
          :max="3650"
          :step="5"
          :format="(v) => `${v} д`"
          @update:model-value="(v) => store.updateSettings({ maxInterval: v })"
        />
      </SettingsRow>
      <SettingsRow title="Разброс интервалов" desc="Немного рандомизирует интервалы, чтобы карточки, изученные в один день, не приходили всегда вместе.">
        <Switch :model-value="store.settings.fuzz" @update:model-value="(v) => store.updateSettings({ fuzz: v })" />
      </SettingsRow>
      <SettingsRow title="Автодобавление в колоду" desc="Когда урок отмечается изученным, его карточка автоматически попадает в повторение.">
        <Switch :model-value="store.settings.autoAdd" @update:model-value="(v) => store.updateSettings({ autoAdd: v })" />
      </SettingsRow>
    </div>

    <h2 id="offline" class="label mt-14 scroll-mt-24">Офлайн и приложение</h2>
    <div class="border-t">
      <ClientOnly><OfflineSettings /></ClientOnly>
    </div>

    <h2 class="label mt-14">Данные</h2>
    <div class="border-t">
      <SettingsRow
        title="Резервная копия"
        desc="Весь прогресс хранится только в localStorage этого браузера. Сохраните файл, чтобы перенести его на другое устройство или не потерять при очистке данных."
      >
        <div class="flex gap-2">
          <Button variant="outline" @click="exportData"><DownloadIcon /> Экспорт</Button>
          <Button variant="outline" @click="fileRef?.click()"><UploadIcon /> Импорт</Button>
          <input ref="fileRef" type="file" accept="application/json,.json" class="hidden" @change="onFile" />
        </div>
      </SettingsRow>
      <SettingsRow title="Сбросить прогресс" desc="Удалит отметки уроков, все карточки и историю повторений. Действие необратимо.">
        <Button variant="destructive" @click="confirmOpen = true"><Trash2Icon /> Сбросить всё</Button>
      </SettingsRow>
    </div>

    <Dialog
      v-model:open="confirmOpen"
      title="Сбросить весь прогресс?"
      description="Отметки уроков, карточки FSRS и статистика будут удалены. Рекомендуем сначала сделать экспорт."
    >
      <template #footer>
        <Button variant="outline" @click="confirmOpen = false">Отмена</Button>
        <Button @click="resetAll">Сбросить</Button>
      </template>
    </Dialog>
  </main>
</template>
