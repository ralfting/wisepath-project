'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useClickOutside, useHotkeys, useWindowEvent } from '@mantine/hooks';
import type { Path } from '@wisepath/domain/paths';
import { OPEN_SEARCH_EVENT } from '@/features/paths/editor';
import { SEARCH_RESULTS_ID } from '../MapSearchResults/MapSearchResults';
import { findInMap } from './PathMap.helpers';

/**
 * The map's search: folded until wanted (a click, ⌘K, or ⌘K in the page's text), what it finds marked on the map
 * and listed under it, the result the arrows mark (brought into view on the map), and opening one while keeping the
 * cursor in the search for the next
 */
export function useMapSearch({
  path,
  select,
  bringIntoView,
}: {
  path: Path;
  select: (pageId: string) => void;
  bringIntoView: (pageId: string) => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => findInMap(path, query), [path, query]);
  const { results } = matches;
  // The result the arrow keys mark, opened by Enter; back to the first as the search changes
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [query]);

  // Focused once rendered: opened from the page's text, the field may not exist yet on the next frame
  const [focusCount, setFocusCount] = useState(0);
  useEffect(() => {
    if (focusCount) field.current?.focus();
  }, [focusCount]);
  const openSearch = () => {
    setOpen(true);
    setFocusCount((n) => n + 1);
  };
  // A click anywhere else folds it; what it found stays marked, and the folded search shows what it holds
  const wrap = useClickOutside<HTMLDivElement>(() => setOpen(false));
  // ⌘K works from fields too; in the page's text it comes as an event (with text selected there, it makes a link)
  useHotkeys([['mod+K', openSearch]], []);
  useWindowEvent(OPEN_SEARCH_EVENT, openSearch);

  // A page opened from the search keeps the cursor in it, to go on to the next result: the drawer would take it
  // for the page's text. Only while the page opens; a click anywhere lets go
  const openResult = (pageId: string) => {
    const stop = () => {
      window.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('pointerdown', stop, true);
    };
    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as Element).closest?.('.mantine-Drawer-content')) field.current?.focus();
    };
    window.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('pointerdown', stop, true);
    setTimeout(stop, 1500);
    select(pageId);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Esc empties it, then closes it; the drawer, if open, is left alone
      event.stopPropagation();
      if (query) setQuery('');
      else {
        setOpen(false);
        field.current?.blur();
      }
    }
    if (results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const to = (active + step + results.length) % results.length;
      setActive(to);
      // Brings the page it marks into view on the map
      bringIntoView(results[to].id);
      document.getElementById(`${SEARCH_RESULTS_ID}-${to}`)?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter') openResult(results[Math.min(active, results.length - 1)].id);
  };

  return {
    field,
    wrap,
    state: {
      open,
      query,
      matchIds: matches.ids,
      results,
      active,
      // The page the marked result is, for the map to single out
      activeId: open && results.length > 0 ? results[Math.min(active, results.length - 1)].id : null,
    },
    operations: {
      open: openSearch,
      setQuery,
      clear: () => setQuery(''),
      // Leaving an empty search folds it
      blur: () => !query && setOpen(false),
      keyDown,
      setActive,
      openResult,
    },
  };
}
