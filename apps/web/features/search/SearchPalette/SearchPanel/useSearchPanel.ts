'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { usePaletteKeys } from '@/ui/Palette/usePaletteKeys';
import { mapWithPageHref, pageHref } from '@/shared/routes';
import { usePaths } from '@/useCases/paths';
import { usePageSearch, useRecentPages } from '@/useCases/search';
import { optionId, searchRows } from '../SearchPalette.helpers';
import type { Row } from '../SearchPalette.helpers';

/** What the list is headed with: the recent pages, or how many were found */
export type SearchHeading = 'recent' | 'found' | null;
/** What is said under the list when it has nothing to show */
export type SearchNotice = 'recentEmpty' | 'noneFound' | 'unavailable' | null;

/**
 * The search panel's view model: what is typed, the rows (hits, or the recent pages when nothing is), the one the
 * arrows mark, opening a row on its map or as a full page, and what the list is headed and followed with
 */
export function useSearchPanel({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { query, setQuery, state: search, retry } = usePageSearch();
  const recent = useRecentPages();
  const paths = usePaths();

  // Each opening starts afresh, on the recent pages; before the field can take a key
  useLayoutEffect(() => setQuery(''), [setQuery]);

  const rows = useMemo(() => searchRows(search, recent, paths), [search, recent, paths]);

  const open = (row: Row, full: boolean) => {
    onDone();
    // A page URL loaded directly is the full page; navigating to it inside the app would open the drawer instead
    if (full) window.location.assign(pageHref(row.pathId, row.pageId));
    // On its map, the page opens in the drawer
    else router.push(mapWithPageHref(row.pathId, row.pageId));
  };

  // The row the arrows mark, opened by Enter; back to the first whenever the list changes
  const keys = usePaletteKeys(rows, (row) => open(row, false));
  const { active } = keys;

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Only the palette closes: a drawer open behind it stays
      event.preventDefault();
      event.stopPropagation();
      onDone();
      return;
    }
    // ⌘Enter opens the marked row as a full page; the rest (↑ ↓ Enter) is the palette's
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && rows[active] && !event.nativeEvent.isComposing) {
      event.preventDefault();
      open(rows[active], true);
      return;
    }
    keys.onKeyDown(event);
  };

  // The marked row stays in view as the arrows move it
  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const heading: SearchHeading =
    search.status === 'idle' ? (recent.length > 0 ? 'recent' : null) : search.status === 'ready' && rows.length > 0 ? 'found' : null;
  const notice: SearchNotice =
    search.status === 'unavailable'
      ? 'unavailable'
      : search.status === 'idle' && rows.length === 0
        ? 'recentEmpty'
        : search.status === 'ready' && rows.length === 0 && !search.stale
          ? 'noneFound'
          : null;

  return {
    state: {
      query,
      rows,
      active,
      heading,
      notice,
      searchedFor: search.status === 'ready' ? search.query : '',
      busy: search.status === 'loading' || (search.status === 'ready' && search.stale),
      // Said out loud as it changes: how many pages were found, or that none was
      settled: search.status === 'ready' && !search.stale,
    },
    operations: { setQuery, keyDown, setActive: keys.setActive, open, retry },
  };
}
