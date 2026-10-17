import { marksIn } from '@wisepath/domain/search';
import type { Mark } from '@wisepath/domain/search';
import type { PageSearchState, RecentPage } from '@/useCases/search';
import { displayTitle } from '@/i18n/title';

/** Asks the mounted host to open the palette, from a button or another shortcut */
export const OPEN_SEARCH_PALETTE_EVENT = 'wisepath:open-search-palette';

export const LIST_ID = 'search-palette-list';

export const optionId = (i: number) => `${LIST_ID}-${i}`;

/** True for ⌘P on a Mac, Ctrl P elsewhere: the key editors use to go to a file */
export const isSearchShortcut = (event: globalThis.KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'p';

/** One row of the list, from a search result or a recent page */
export interface Row {
  key: string;
  pathId: string;
  pageId: string;
  title: string;
  titleMarks: ReadonlyArray<Mark>;
  where: string;
  excerpt: { text: string; marks: ReadonlyArray<Mark> } | null;
}

/**
 * The palette's rows: the search's hits once it has answered, else (nothing typed) the pages opened most recently.
 * A recent page whose path was deleted since is dropped, and one whose path was renamed shows its title now.
 */
export function searchRows(
  search: PageSearchState,
  recent: ReadonlyArray<RecentPage>,
  paths: ReadonlyArray<{ readonly id: string; readonly title: string }> | null,
): ReadonlyArray<Row> {
  if (search.status === 'ready') {
    return search.hits.map((hit) => {
      const title = displayTitle(hit);
      return {
        key: `${hit.pathId}/${hit.pageId}`,
        pathId: hit.pathId,
        pageId: hit.pageId,
        title,
        titleMarks: marksIn(title, search.query),
        where: [hit.pathTitle, ...hit.where.map((w) => displayTitle({ title: w }))].join(' › '),
        excerpt: hit.excerpt,
      };
    });
  }
  if (search.status !== 'idle') return [];
  const titles = paths ? new Map(paths.map((p) => [p.id, p.title])) : null;
  return recent
    .filter((page) => !titles || titles.has(page.pathId))
    .map((page) => ({
      key: `${page.pathId}/${page.pageId}`,
      pathId: page.pathId,
      pageId: page.pageId,
      title: displayTitle(page),
      titleMarks: [],
      where: titles?.get(page.pathId) ?? page.pathTitle,
      excerpt: null,
    }));
}
