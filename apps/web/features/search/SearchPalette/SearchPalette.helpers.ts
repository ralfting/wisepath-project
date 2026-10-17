'use client';

import type { Mark } from '@wisepath/domain/search';

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
