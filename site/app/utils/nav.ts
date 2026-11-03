import type { NavNode } from "#shared/types/content";

/** id всех уроков внутри узла навигации. */
export function navIds(n: NavNode): string[] {
  return n.kind === "lesson" ? [n.id] : (n.children ?? []).flatMap(navIds);
}

export function navContains(n: NavNode, id: string): boolean {
  return n.id === id || (n.children ?? []).some((c) => navContains(c, id));
}
