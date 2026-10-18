import { findPageByTitle, mapTree, pageSlugs } from '@wisepath/domain/paths';
import type { MapNode, Page, Path } from '@wisepath/domain/paths';
import { catalogHref } from '@/shared/routes';

/** A page's address in the catalog: the path's own for the root page */
export function hrefsOf(path: Path, pathSlug: string) {
  const slugs = pageSlugs(path);
  const hrefOf = (page: Pick<Page, 'id'>) => (page.id === path.rootPageId ? catalogHref(pathSlug) : catalogHref(pathSlug, slugs.get(page.id)));
  const hrefOfTitle = (title: string) => {
    const page = findPageByTitle(path.pages, title);
    return page ? hrefOf(page) : null;
  };
  return { hrefOf, hrefOfTitle };
}

/** The map's pages in reading order, root first, each with how deep it sits; pages no link reaches are left out */
export function outline(path: Path): ReadonlyArray<{ readonly page: Page; readonly depth: number }> {
  const out: Array<{ page: Page; depth: number }> = [];
  const walk = (node: MapNode) => {
    out.push({ page: node.page, depth: node.depth });
    node.children.forEach(walk);
  };
  walk(mapTree(path).root);
  return out;
}
