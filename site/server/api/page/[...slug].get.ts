import { crumb, getContent, getNeighbours, getNode, getParents, lessonIdsOf, readLesson, toNav } from "../../utils/content";
import { renderLesson } from "../../utils/markdown";
import type { FolderPage, LessonPage, PageData } from "../../../shared/types/content";

export default defineEventHandler(async (event): Promise<PageData> => {
  const slug = (getRouterParam(event, "slug") ?? "").split("/").filter(Boolean);
  const node = getNode(slug);
  if (!node) throw createError({ statusCode: 404, message: "Не найдено" });

  const parents = getParents(node).map(crumb);

  if (node.kind === "lesson") {
    const { title, html, toc, minutes } = await renderLesson(readLesson(node), node.rel);
    const { prev, next } = getNeighbours(node);
    const top = getParents(node)[0];
    const page: LessonPage = {
      kind: "lesson",
      node: crumb(node),
      parents,
      title: title ?? node.title,
      html,
      toc,
      minutes,
      prev: prev && crumb(prev),
      next: next && crumb(next),
      tree: top ? toNav(top) : null,
      sections: getContent().root.map(crumb),
    };
    return page;
  }

  const page: FolderPage = {
    kind: "folder",
    node: crumb(node),
    parents,
    ids: lessonIdsOf(node),
    children: node.children.map((c) => ({
      ...crumb(c),
      kind: c.kind,
      ids: lessonIdsOf(c),
      children: c.children.map((g) => ({ ...crumb(g), kind: g.kind, ids: lessonIdsOf(g) })),
    })),
  };
  return page;
});
