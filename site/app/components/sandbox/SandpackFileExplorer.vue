<script setup lang="ts">
import { ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon } from "lucide-vue-next";
import { useSandpack } from "./sandpack";

/** Дерево файлов проекта: папки сворачиваются, клик по файлу открывает его во вкладке. */
const sp = useSandpack();
const collapsed = ref(new Set<string>());

interface Row {
  path: string;
  name: string;
  depth: number;
  dir: boolean;
}

const rows = computed<Row[]>(() => {
  const paths = Object.keys(sp.files).sort((a, b) => {
    // папки раньше файлов на каждом уровне
    const pa = a.split("/");
    const pb = b.split("/");
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      if (pa[i] === pb[i]) continue;
      const aDir = i < pa.length - 1;
      const bDir = i < pb.length - 1;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return pa[i]!.localeCompare(pb[i]!);
    }
    return pa.length - pb.length;
  });
  const out: Row[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let hidden = false;
    for (let i = 0; i < parts.length; i++) {
      const sub = `/${parts.slice(0, i + 1).join("/")}`;
      const dir = i < parts.length - 1;
      if (dir) {
        if (!seen.has(sub) && !hidden) out.push({ path: sub, name: parts[i]!, depth: i, dir: true });
        seen.add(sub);
        if (collapsed.value.has(sub)) hidden = true;
      } else if (!hidden) out.push({ path, name: parts[i]!, depth: i, dir: false });
    }
  }
  return out;
});

function toggle(path: string) {
  const next = new Set(collapsed.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  collapsed.value = next;
}
</script>

<template>
  <div class="thin-scrollbar overflow-auto py-1.5 font-mono text-[12px]">
    <button
      v-for="r in rows"
      :key="r.path"
      type="button"
      :title="r.path"
      :style="{ paddingLeft: `${0.75 + r.depth * 0.85}rem` }"
      :class="
        cn(
          'flex w-full items-center gap-1.5 py-1 pr-3 text-left transition-colors',
          !r.dir && r.path === sp.activeFile.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )
      "
      @click="r.dir ? toggle(r.path) : sp.openFile(r.path)"
    >
      <template v-if="r.dir">
        <ChevronRightIcon :class="cn('size-3 shrink-0 transition-transform', !collapsed.has(r.path) && 'rotate-90')" />
        <FolderIcon v-if="collapsed.has(r.path)" class="size-3.5 shrink-0" />
        <FolderOpenIcon v-else class="size-3.5 shrink-0" />
      </template>
      <template v-else>
        <span class="size-3 shrink-0" />
        <FileIcon class="size-3.5 shrink-0" />
      </template>
      <span class="truncate">{{ r.name }}</span>
    </button>
  </div>
</template>
