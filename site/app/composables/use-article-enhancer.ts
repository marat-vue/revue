import type { Ref } from "vue";
import { LESSON_SNIPPET_KEY, SANDBOX_LANGS, type ExampleBlock, type LessonSnippet } from "~/utils/sandbox-shared";

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const DONE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const PLAY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 14 9-14 9V3z"/></svg>';

const LANG_LABELS: Record<string, string> = { plaintext: "text", javascript: "js", typescript: "ts" };

export interface LiveSlot {
  el: HTMLElement;
  blocks: ExampleBlock[];
}

/**
 * Дополняет статический HTML урока: шапка блоков кода с кнопками «копировать» и «в песочницу»,
 * клиентская навигация по внутренним ссылкам без перезагрузки и поиск заглушек живых примеров.
 */
export function useArticleEnhancer(root: Ref<HTMLElement | null>) {
  const base = useBasePath();
  const slots = shallowRef<LiveSlot[]>([]);

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-internal]");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    e.preventDefault();
    navigateTo(base && href.startsWith(base) ? href.slice(base.length) : href);
  };

  onMounted(() => {
    const el = root.value;
    if (!el) return;

    el.querySelectorAll<HTMLElement>("figure[data-rehype-pretty-code-figure]").forEach((fig) => {
      if (fig.querySelector(".code-head")) return;
      const pre = fig.querySelector("pre");
      if (!pre) return;
      const lang = pre.dataset.language ?? "";
      const head = document.createElement("div");
      head.className = "code-head";
      const btnClass = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
      const runnable = SANDBOX_LANGS.has(lang);
      head.innerHTML = `<span class="label">${LANG_LABELS[lang] ?? lang}</span><span class="flex items-center">${
        runnable ? `<button type="button" class="run-btn ${btnClass}" aria-label="Открыть в песочнице" title="Открыть в песочнице">${PLAY_ICON}</button>` : ""
      }<button type="button" class="copy-btn ${btnClass}" aria-label="Копировать код" title="Копировать">${COPY_ICON}</button></span>`;
      head.querySelector(".run-btn")?.addEventListener("click", () => {
        const snippet: LessonSnippet = {
          blocks: [{ lang, code: pre.innerText.replace(/\n$/, "") }],
          title: document.querySelector("h1")?.textContent?.trim(),
        };
        try {
          localStorage.setItem(LESSON_SNIPPET_KEY, JSON.stringify(snippet));
        } catch {}
        navigateTo("/sandbox/");
      });
      const btn = head.querySelector<HTMLButtonElement>(".copy-btn")!;
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ""));
          btn.innerHTML = DONE_ICON;
          setTimeout(() => (btn.innerHTML = COPY_ICON), 1400);
        } catch {}
      });
      fig.prepend(head);
    });

    // заглушки живых примеров (их ставит remarkLiveExamples) — сюда телепортируются компоненты LiveExample
    slots.value = [...el.querySelectorAll<HTMLElement>(".live-example")].flatMap((slot) => {
      try {
        const { blocks } = JSON.parse(decodeURIComponent(slot.dataset.example ?? "")) as { blocks: ExampleBlock[] };
        return blocks?.length ? [{ el: slot, blocks }] : [];
      } catch {
        return [];
      }
    });

    el.addEventListener("click", onClick);
  });

  onBeforeUnmount(() => root.value?.removeEventListener("click", onClick));

  return { slots };
}
