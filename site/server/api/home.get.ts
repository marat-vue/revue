import { crumb, getContent, lessonIdsOf } from "../utils/content";
import { sectionMeta } from "../../shared/utils/sections";
import type { HomeData } from "../../shared/types/content";

export default defineEventHandler((): HomeData => {
  const { root, lessons } = getContent();
  const sections = root.filter((n) => n.kind === "folder");
  return {
    sections: sections.map((s) => ({
      ...crumb(s),
      ids: lessonIdsOf(s),
      topics: s.children.filter((c) => c.kind === "folder").length,
      ...sectionMeta(s.title),
    })),
    extras: root.filter((n) => n.kind === "lesson").map(crumb),
    lessonsCount: lessons.length,
    allIds: lessons.map((l) => l.id),
  };
});
