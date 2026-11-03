import { BRAND } from "../../shared/utils/brand";

/** Манифест PWA: установка на главный экран и запуск в отдельном окне. */
export default defineEventHandler((event) => {
  const base = useRuntimeConfig().app.baseURL.replace(/\/+$/, "");
  setHeader(event, "content-type", "application/manifest+json");
  return {
    id: `${base}/`,
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    lang: "ru",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    categories: ["education", "developer", "productivity"],
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Повторение", url: `${base}/review/`, description: "Карточки к повторению на сегодня" },
      { name: "Песочница", url: `${base}/sandbox/`, description: "Онлайн-редактор HTML, JS, React и Vue" },
    ],
  };
});
