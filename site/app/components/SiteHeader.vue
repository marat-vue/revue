<script setup lang="ts">
import { MenuIcon, SearchIcon } from "lucide-vue-next";
import { useAppStore } from "~/stores/app";

const NAV = [
  { href: "/", label: "Разделы", match: (p: string) => p === "/" || p.startsWith("/l/") },
  { href: "/review/", label: "Повторение", match: (p: string) => p.startsWith("/review") },
  { href: "/sandbox/", label: "Песочница", match: (p: string) => p.startsWith("/sandbox") },
  { href: "/stats/", label: "Статистика", match: (p: string) => p.startsWith("/stats") },
  { href: "/settings/", label: "Настройки", match: (p: string) => p.startsWith("/settings") },
];

const route = useRoute();
const store = useAppStore();
const due = useDueSummary();
const menuOpen = ref(false);
const showDue = computed(() => store.hydrated && due.value.total > 0);
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
    <div class="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
      <NuxtLink to="/" class="group flex shrink-0 items-center gap-2.5" aria-label="На главную">
        <span
          class="grid size-7 place-items-center bg-foreground font-mono text-[11px] font-bold tracking-tighter text-background transition-transform duration-500 group-hover:rotate-90"
        >
          re:
        </span>
        <span class="font-mono text-[13px] font-medium tracking-[0.04em]">
          <span class="text-muted-foreground">{{ BRAND.prefix }}</span>{{ BRAND.suffix }}
        </span>
      </NuxtLink>

      <nav aria-label="Основная навигация" class="ml-2 hidden min-w-0 items-center md:flex">
        <NuxtLink
          v-for="item in NAV"
          :key="item.href"
          :to="item.href"
          :aria-current="item.match(route.path) ? 'page' : undefined"
          :class="
            cn(
              'relative flex h-14 items-center gap-1.5 px-2.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
              item.match(route.path) && 'text-foreground',
            )
          "
        >
          {{ item.label }}
          <span
            v-if="item.href === '/review/' && showDue"
            class="min-w-5 rounded-full bg-foreground px-1.5 text-center font-mono text-[10px] leading-5 text-background tabular-nums"
          >
            {{ due.total }}
          </span>
          <span v-if="item.match(route.path)" class="absolute inset-x-2.5 -bottom-px h-px bg-foreground" />
        </NuxtLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Поиск по урокам"
          class="flex size-11 items-center justify-center gap-2 rounded-md border bg-muted/40 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-8 md:w-auto md:pr-1.5 md:pl-2.5"
          @click="openSearch"
        >
          <SearchIcon class="size-3.5" />
          <span class="hidden pr-6 lg:inline">Поиск по урокам</span>
          <Kbd class="hidden md:inline-flex">Ctrl K</Kbd>
        </button>
        <ThemeToggle />
        <Sheet
          v-model:open="menuOpen"
          side="right"
          :title="BRAND.name"
          title-class="pr-10 font-mono"
          class="w-[min(88vw,360px)] gap-6 overflow-y-auto px-5 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <template #trigger>
            <Button variant="ghost" size="icon" class="size-11 md:hidden" aria-label="Открыть меню"><MenuIcon /></Button>
          </template>
          <nav aria-label="Мобильная навигация" class="flex flex-col gap-2">
            <NuxtLink
              v-for="item in NAV"
              :key="item.href"
              :to="item.href"
              :aria-current="item.match(route.path) ? 'page' : undefined"
              :class="
                cn(
                  'flex min-h-12 items-center justify-between gap-3 rounded-md px-4 py-3 text-base transition-colors hover:bg-muted',
                  item.match(route.path) ? 'bg-muted font-medium' : 'text-muted-foreground',
                )
              "
              @click="menuOpen = false"
            >
              {{ item.label }}
              <span v-if="item.href === '/review/' && showDue" class="font-mono text-xs tabular-nums">{{ due.total }}</span>
            </NuxtLink>
          </nav>
        </Sheet>
      </div>
    </div>
  </header>
</template>
