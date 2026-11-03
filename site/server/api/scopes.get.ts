import { getContent } from "../utils/content";
import type { ReviewScopes } from "../../shared/types/content";

/** Разделы и темы, которые можно повторять отдельно (/review/?scope=…). */
export default defineEventHandler((): ReviewScopes =>
  Object.fromEntries([...getContent().bySlug.values()].filter((n) => n.kind === "folder").map((n) => [n.id, { title: n.title, href: n.href }])),
);
