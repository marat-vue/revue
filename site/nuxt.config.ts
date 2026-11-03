import tailwindcss from "@tailwindcss/vite";
import { BRAND } from "./shared/utils/brand";
import { allRoutes } from "./server/utils/content";

// На GitHub Pages сайт живёт по адресу https://<user>.github.io/<repo>/,
// поэтому базовый путь задаётся переменной окружения при сборке в CI.
const baseURL = `${(process.env.NUXT_APP_BASE_URL ?? "").replace(/\/+$/, "")}/`;
// actions/configure-pages отдаёт путь без слеша на конце ("/redev"), а Nuxt читает эту же переменную
// и во время пререндера — без слеша все страницы превращаются в редиректы
process.env.NUXT_APP_BASE_URL = baseURL;

export default defineNuxtConfig({
  compatibilityDate: "2026-01-01",
  devtools: { enabled: false },
  ssr: true,

  modules: ["@pinia/nuxt", "@nuxtjs/color-mode"],

  css: ["~/assets/css/main.css"],

  // компоненты — только .vue: рядом лежат вспомогательные .ts-модули песочницы
  components: [{ path: "~/components", pathPrefix: false, extensions: ["vue"] }],

  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: "ru", class: "antialiased" },
      bodyAttrs: { class: "min-h-dvh flex flex-col" },
      title: BRAND.title,
      meta: [
        { name: "description", content: BRAND.description },
        { name: "application-name", content: BRAND.name },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: BRAND.name },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#ffffff" },
        { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0b0b0b" },
      ],
      link: [
        { rel: "icon", href: `${baseURL}favicon.ico`, sizes: "any" },
        { rel: "apple-touch-icon", href: `${baseURL}apple-icon.png` },
        { rel: "manifest", href: `${baseURL}manifest.webmanifest` },
      ],
    },
  },

  // тема: те же значения и ключ localStorage, что были у next-themes, — выбор пользователя сохранится
  colorMode: {
    classSuffix: "",
    preference: "dark",
    fallback: "dark",
    storageKey: "theme",
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "@codesandbox/sandpack-client",
        "@vueuse/core",
        "class-variance-authority",
        "cn",
        "lucide-vue-next",
        "lz-string",
        "reka-ui",
        "ts-fsrs",
        "vue-sonner",
        "workbox-window",
      ],
    },
  },

  nitro: {
    rollupConfig: {
      // То же ограничение при записи серверных чанков пререндера.
      maxParallelFileOps: process.platform === "win32" ? 1 : 1000,
    },
    prerender: {
      // Параллельное создание вложенных папок на Windows может завершиться EPERM;
      // Nitro при этом пропускает страницу и всё равно сообщает об успешной сборке.
      concurrency: process.platform === "win32" ? 1 : 8,
      // все страницы перечислены явно, поэтому ссылки не обходим: битая относительная ссылка в уроке
      // (она помечается data-broken) не должна ронять сборку
      crawlLinks: false,
      failOnError: true,
      routes: ["/", "/review/", "/stats/", "/settings/", "/sandbox/", "/offline/", "/404.html", "/cards.json", "/search-index.json", "/manifest.webmanifest", ...allRoutes()],
    },
  },

  experimental: {
    // данные страниц уроков отдаются отдельным _payload.json — клиентские переходы не тянут HTML целиком
    payloadExtraction: true,
  },

  typescript: {
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: false } },
  },
});
