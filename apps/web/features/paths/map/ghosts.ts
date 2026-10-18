import { PageId, canEdit, pendingTitles } from '@wisepath/domain/paths';
import type { MapNode, MapTree, Page, Path } from '@wisepath/domain/paths';

/**
 * Ghost pages: the [[links]] to pages not made yet, drawn on the map and in the list beside the page that names them,
 * so writing [[Title]] visibly adds something. They live only in what is drawn: counts and progress come from the real
 * tree. Opening one makes the page.
 */

const PREFIX = 'pending:';

export const isGhost = (pageId: string) => pageId.startsWith(PREFIX);

/** The title a ghost stands for: its id is the prefix, the id of the page that names it, then the title */
export const ghostTitle = (pageId: string) => pageId.slice(pageId.indexOf(':', PREFIX.length) + 1);

/** A ghost's page: its id says which page names it (two pages can name the same missing title), its title is the name */
const ghostPage = (parentId: PageId, title: string): Page => ({
  id: PageId.make(`${PREFIX}${parentId}:${title}`),
  title,
  content: '',
  studied: false,
  updatedAt: '',
});

/**
 * The tree to draw: each page on the map with its ghost pages after its real ones. Only for someone who may add
 * pages; a reader sees the map as it is
 */
export function withGhosts(path: Path, tree: MapTree): MapTree {
  if (!canEdit(path.access)) return tree;
  const nodes = new Map<PageId, MapNode>();
  const grow = (node: MapNode): MapNode => {
    const ghosts = pendingTitles(path, node.page.id).map(
      (title): MapNode => ({ page: ghostPage(node.page.id, title), depth: node.depth + 1, parentId: node.page.id, children: [] }),
    );
    const grown: MapNode = { ...node, children: [...node.children.map(grow), ...ghosts] };
    nodes.set(node.page.id, grown);
    for (const ghost of ghosts) nodes.set(ghost.page.id, ghost);
    return grown;
  };
  const root = grow(tree.root);
  return { ...tree, root, nodes };
}
