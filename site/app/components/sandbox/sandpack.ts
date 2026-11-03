import { loadSandpackClient, type SandpackClient, type SandpackMessage } from "@codesandbox/sandpack-client";
import type { InjectionKey } from "vue";

/**
 * Состояние песочницы на Vue.
 * Файлы проекта живут в реактивном объекте; превью и тесты — отдельные iframe-клиенты бандлера
 * CodeSandbox, которым изменения отправляются с задержкой (recompileDelay).
 */

export type Listener = (msg: SandpackMessage & Record<string, unknown>, clientId: string) => void;

export type SandpackStatus = "idle" | "running" | "timeout";

export interface SandpackOptions {
  files: Record<string, string>;
  environment: string;
  activeFile: string;
  visibleFiles?: string[];
  recompileDelay?: number;
}

export interface Sandpack {
  files: Record<string, string>;
  environment: string;
  activeFile: Ref<string>;
  visibleFiles: Ref<string[]>;
  status: Ref<SandpackStatus>;
  /** ошибки компиляции по файлам — для подсветки в редакторе */
  errors: Ref<{ path: string; line: number; column?: number; message: string } | null>;
  register(iframe: HTMLIFrameElement, id: string): Promise<SandpackClient | null>;
  unregister(id: string): void;
  client(id: string): SandpackClient | undefined;
  listen(cb: Listener, clientId?: string): () => void;
  dispatch(msg: Parameters<SandpackClient["dispatch"]>[0], clientId?: string): void;
  openFile(path: string): void;
  closeFile(path: string): void;
  addFile(path: string, code: string): void;
  deleteFile(path: string): void;
  updateFile(path: string, code: string): void;
  resetAllFiles(): void;
}

const BUNDLER_TIMEOUT = 40_000;

export function createSandpack(opts: SandpackOptions): Sandpack {
  const initial = { ...opts.files };
  const files = reactive<Record<string, string>>({ ...opts.files });
  const activeFile = ref(opts.activeFile);
  const visibleFiles = ref<string[]>(opts.visibleFiles?.length ? [...opts.visibleFiles] : [opts.activeFile]);
  const status = ref<SandpackStatus>("idle");
  const errors = ref<Sandpack["errors"]["value"]>(null);

  const clients = new Map<string, SandpackClient>();
  const unsubscribers = new Map<string, () => void>();
  const listeners = new Set<{ cb: Listener; clientId?: string }>();

  const bundlerFiles = () => Object.fromEntries(Object.entries(files).map(([path, code]) => [path, { code }]));
  const setup = () => ({ files: bundlerFiles(), template: opts.environment as never });

  const emit = (msg: SandpackMessage & Record<string, unknown>, clientId: string) => {
    if (msg.type === "action" && msg.action === "show-error") {
      errors.value = { path: String(msg.path ?? ""), line: Number(msg.line ?? 0), column: Number(msg.column ?? 0), message: String(msg.message ?? "") };
    } else if (msg.type === "start" || (msg.type === "done" && !msg.compilatonError)) {
      errors.value = null;
    }
    for (const l of listeners) if (!l.clientId || l.clientId === clientId) l.cb(msg, clientId);
  };

  async function register(iframe: HTMLIFrameElement, id: string) {
    unregister(id);
    const timer = setTimeout(() => status.value === "idle" && (status.value = "timeout"), BUNDLER_TIMEOUT);
    try {
      const client = await loadSandpackClient(iframe, setup(), {
        showOpenInCodeSandbox: false,
        showErrorScreen: true,
        showLoadingScreen: true,
      });
      clients.set(id, client);
      unsubscribers.set(
        id,
        client.listen((msg) => {
          if (msg.type === "done" || msg.type === "start") {
            clearTimeout(timer);
            status.value = "running";
          }
          emit(msg as SandpackMessage & Record<string, unknown>, id);
        }),
      );
      return client;
    } catch {
      clearTimeout(timer);
      status.value = "timeout";
      return null;
    }
  }

  function unregister(id: string) {
    unsubscribers.get(id)?.();
    unsubscribers.delete(id);
    const client = clients.get(id);
    if (client) {
      client.destroy();
      try {
        client.iframe.contentWindow?.location.replace("about:blank");
      } catch {}
      client.iframe.removeAttribute("src");
      clients.delete(id);
    }
  }

  // пересборка с задержкой после правок
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => ({ ...files }),
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = setup();
        for (const c of clients.values()) c.updateSandbox(s);
      }, opts.recompileDelay ?? 500);
    },
    { deep: true },
  );

  onScopeDispose(() => {
    clearTimeout(timer);
    for (const id of [...clients.keys()]) unregister(id);
    listeners.clear();
  });

  return {
    files,
    environment: opts.environment,
    activeFile,
    visibleFiles,
    status,
    errors,
    register,
    unregister,
    client: (id) => clients.get(id),
    listen(cb, clientId) {
      const entry = { cb, clientId };
      listeners.add(entry);
      return () => listeners.delete(entry);
    },
    dispatch(msg, clientId) {
      if (clientId) clients.get(clientId)?.dispatch(msg);
      else for (const c of clients.values()) c.dispatch(msg);
    },
    openFile(path) {
      if (!(path in files)) return;
      if (!visibleFiles.value.includes(path)) visibleFiles.value = [...visibleFiles.value, path];
      activeFile.value = path;
    },
    closeFile(path) {
      if (visibleFiles.value.length <= 1) return;
      const i = visibleFiles.value.indexOf(path);
      visibleFiles.value = visibleFiles.value.filter((p) => p !== path);
      if (activeFile.value === path) activeFile.value = visibleFiles.value[Math.max(0, i - 1)]!;
    },
    addFile(path, code) {
      files[path] = code;
    },
    deleteFile(path) {
      delete files[path];
      visibleFiles.value = visibleFiles.value.filter((p) => p !== path);
      if (activeFile.value === path) activeFile.value = visibleFiles.value[0] ?? Object.keys(files)[0] ?? "";
      if (!visibleFiles.value.length && activeFile.value) visibleFiles.value = [activeFile.value];
    },
    updateFile(path, code) {
      if (files[path] !== code) files[path] = code;
    },
    resetAllFiles() {
      for (const path of Object.keys(files)) if (!(path in initial)) delete files[path];
      Object.assign(files, initial);
      visibleFiles.value = visibleFiles.value.filter((p) => p in files);
      if (!(activeFile.value in files)) activeFile.value = opts.activeFile;
    },
  };
}

export const SANDPACK_KEY: InjectionKey<Sandpack> = Symbol("sandpack");

export function useSandpack() {
  const sp = inject(SANDPACK_KEY);
  if (!sp) throw new Error("useSandpack() вызван вне песочницы");
  return sp;
}
