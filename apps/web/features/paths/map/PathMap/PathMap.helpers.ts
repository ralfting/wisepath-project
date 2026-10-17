import type { Page, Path } from '@wisepath/domain/paths';
import { mapTree, pagesInMapOrder } from '@wisepath/domain/paths';
import { displayTitle } from '@/i18n/title';

/** What the canvas shows: the mind map, or the same pages as an indented list */
export type View = 'map' | 'list';

/** What the map's search found: the pages to mark (null while nothing is typed) and to list, in reading order */
export interface MapMatches {
  readonly ids: ReadonlySet<string> | null;
  readonly results: ReadonlyArray<Page>;
}

/**
 * The pages whose title has what is typed, ignoring case: marked on the map, and listed in the map's reading order
 * followed by the pages off the map
 */
export function findInMap(path: Path, query: string): MapMatches {
  const q = query.trim().toLowerCase();
  if (!q) return { ids: null, results: [] };
  const ids = new Set<string>(path.pages.filter((p) => displayTitle(p).toLowerCase().includes(q)).map((p) => p.id));
  return { ids, results: [...pagesInMapOrder(path), ...mapTree(path).orphans].filter((p) => ids.has(p.id)) };
}
