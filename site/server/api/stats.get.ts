import { crumb, getContent, lessonIdsOf } from "../utils/content";
import type { StatsData } from "../../shared/types/content";

export default defineEventHandler((): StatsData => {
  const { root, lessons } = getContent();
  return { sections: root.map((s) => ({ ...crumb(s), ids: lessonIdsOf(s) })), total: lessons.length };
});
