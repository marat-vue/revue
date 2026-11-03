// Генерирует service worker для офлайн-режима по готовому статическому сайту (.output/public).
// Запускается после `nuxt generate` (см. "build" в package.json).
import { generateSW } from "workbox-build";

const base = (process.env.NUXT_APP_BASE_URL ?? "").replace(/\/+$/, "");
const out = ".output/public";

const { count, size, warnings } = await generateSW({
  globDirectory: out,
  // Заранее кешируем оболочку приложения: скрипты, стили, шрифты, главную, повторение, статистику,
  // настройки, песочницу и данные карточек — этого хватает, чтобы повторять карточки без сети.
  // Уроки (≈2000 страниц, сотни мегабайт) не предзагружаются: они кешируются при открытии
  // или скачиваются разделами в настройках.
  globPatterns: [
    "_nuxt/**/*.{js,css,woff2,json}",
    "index.html",
    "_payload.json",
    "{review,stats,settings,sandbox,offline}/index.html",
    "{review,stats,settings,sandbox,offline}/_payload.json",
    "404.html",
    "cards.json",
    "search-index.json",
    "manifest.webmanifest",
    "icons/*.png",
    "apple-icon.png",
    "favicon.ico",
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  modifyURLPrefix: { "": `${base}/` },
  swDest: `${out}/sw.js`,
  directoryIndex: "index.html",
  // у _payload.json Nuxt добавляет ?_b=<buildId> — для кеша параметр не важен
  ignoreURLParametersMatching: [/^utm_/, /^_b$/],
  // у файлов в _nuxt хеш уже в имени
  dontCacheBustURLsMatching: /\/_nuxt\//,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  // новая версия ждёт, пока пользователь нажмёт «Обновить» (components/PwaRegister.client.vue)
  skipWaiting: false,
  runtimeCaching: [
    {
      // страницы: свежая версия из сети, без сети — из кеша, а если страницы нет — /offline/
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "redev-pages", // то же имя использует «Скачать для офлайна» (app/utils/offline.ts)
        networkTimeoutSeconds: 4,
        precacheFallback: { fallbackURL: `${base}/offline/index.html` },
      },
    },
    {
      // данные страниц для переходов внутри сайта без перезагрузки
      urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith("/_payload.json"),
      handler: "NetworkFirst",
      options: {
        cacheName: "redev-payload",
        networkTimeoutSeconds: 4,
        matchOptions: { ignoreSearch: true },
        // Загруженные разделы используют этот же кеш: лимит в 600 записей удалял
        // данные уроков, которые пользователь специально сохранил для офлайна.
      },
    },
  ],
});

for (const w of warnings) console.warn("[sw]", w);
console.log(`[sw] ${out}/sw.js: precache ${count} файлов, ${(size / 1024 / 1024).toFixed(1)} МБ`);
