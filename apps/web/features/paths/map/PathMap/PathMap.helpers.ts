import type { Page, Path } from '@wisepath/domain/paths';
import { mapTree, pagesInMapOrder, references, tasksIn } from '@wisepath/domain/paths';
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

/** All that the map reads of a page's text: its [[links]] and citations, and the activities and questions it asks */
const drawnText = (path: Path, page: Page) => JSON.stringify([references(page.content), tasksIn(path.id, page)]);

/** Whether two objects have the same fields, each the same value, but those named */
const sameFieldsBut = <T extends object>(a: T, b: T, skip: ReadonlyArray<string>) => {
  const fields = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...fields].every((field) => skip.includes(field) || a[field as keyof T] === b[field as keyof T]);
};

/**
 * Whether the map draws two versions of a path the same: they differ at most in pages' text, and not in what the map
 * reads of it. Typing in a page then leaves the map alone, while a [[link]] or an activity written there still shows
 */
export function drawnAlike(before: Path, after: Path): boolean {
  if (before === after) return true;
  if (!sameFieldsBut(before, after, ['pages']) || before.pages.length !== after.pages.length) return false;
  return before.pages.every((page, index) => {
    const other = after.pages[index];
    if (page === other) return true;
    return sameFieldsBut(page, other, ['content', 'updatedAt']) && drawnText(before, page) === drawnText(after, other);
  });
}
