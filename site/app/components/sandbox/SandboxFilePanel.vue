<script setup lang="ts">
import { toast } from "vue-sonner";
import { FilePlusIcon, PencilIcon, Trash2Icon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";

const PROTECTED = new Set(["/package.json", "/index.html", "/public/index.html", "/index.tsx", "/src/main.ts"]);

function normalizePath(raw: string) {
  const path = raw.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  return path.startsWith("/") ? path : `/${path}`;
}

const sp = useSandpack();
const mode = ref<"create" | "rename" | null>(null);
const value = ref("");
const input = ref<HTMLInputElement | null>(null);

watch(mode, (m) => m && nextTick(() => input.value?.focus()));

function start(next: "create" | "rename") {
  mode.value = next;
  const active = sp.activeFile.value;
  value.value = next === "rename" ? active : active.slice(0, active.lastIndexOf("/") + 1);
}

function submit() {
  const path = normalizePath(value.value);
  const active = sp.activeFile.value;
  if (!mode.value) return;
  if (path.endsWith("/") || !/\.[a-z0-9]+$/i.test(path)) {
    toast.error("Укажите имя файла с расширением, например components/Card.tsx");
    return;
  }
  if (path in sp.files && (mode.value === "create" || path !== active)) {
    toast.error(`Файл ${path} уже существует`);
    return;
  }
  if (mode.value === "create") {
    sp.addFile(path, "");
    sp.openFile(path);
  } else if (path !== active) {
    const code = sp.files[active] ?? "";
    sp.addFile(path, code);
    sp.openFile(path);
    sp.deleteFile(active);
    toast.message("Файл переименован — не забудьте обновить импорты");
  }
  mode.value = null;
}

function remove() {
  const active = sp.activeFile.value;
  if (PROTECTED.has(active)) {
    toast.error("Этот файл нужен для запуска проекта");
    return;
  }
  if (!confirm(`Удалить ${active}?`)) return;
  sp.deleteFile(active);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex h-10 shrink-0 items-center justify-between border-b pr-1.5 pl-3">
      <span class="label">Файлы</span>
      <div class="flex items-center">
        <SandboxIconButton label="Новый файл" @click="start('create')"><FilePlusIcon class="size-3.5" /></SandboxIconButton>
        <SandboxIconButton label="Переименовать текущий файл" @click="start('rename')"><PencilIcon class="size-3.5" /></SandboxIconButton>
        <SandboxIconButton label="Удалить текущий файл" :disabled="PROTECTED.has(sp.activeFile.value)" @click="remove"><Trash2Icon class="size-3.5" /></SandboxIconButton>
      </div>
    </div>
    <form v-if="mode" class="border-b p-2" @submit.prevent="submit">
      <input
        ref="input"
        v-model="value"
        placeholder="/components/Card.tsx"
        class="h-7 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none focus:border-foreground/40"
        @keydown.esc="mode = null"
        @blur="mode = null"
      />
      <p class="mt-1.5 px-0.5 text-[11px] leading-snug text-muted-foreground">
        Enter — {{ mode === "create" ? "создать" : "переименовать" }}, Esc — отмена. Папки создаются по пути.
      </p>
    </form>
    <SandpackFileExplorer class="min-h-0 flex-1" />
  </div>
</template>
