'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useRef } from 'react';
import { openPageId, pageHref, swapOpenPage } from '@/shared/routes';
import type { EditorFocus } from '@/features/paths/editor';
import { DrawerContext } from './PageDrawer.helpers';

/**
 * A page in the drawer's view model: which page it shows (the URL's, ahead of the route when swapped in place), the
 * pages walked through to it, whether it replaced another (to slide in), where the focus goes (the title when opened
 * from the map, the text when the page was just made, back where it was when reached from another page in the
 * drawer), and moving between pages
 */
export function usePageDrawer({ pathId, routePageId }: { pathId: string; routePageId: string }) {
  // The page in the URL: swapped in place (swapOpenPage) it is ahead of the route's own
  const pageId = openPageId(usePathname(), pathId) ?? routePageId;
  const controls = useContext(DrawerContext);
  const { trail, setTrail, cursors, shown } = controls;
  const before = trail.at === pageId ? trail.before : [];
  // Reached from another page in the drawer: where the cursor was last, else the start. Just made (?new=1): at the
  // end of the text, to write in it
  const isNew = useSearchParams().get('new') === '1';
  const fromDrawer = trail.at === pageId && !isNew;
  // A page that replaces another in the open drawer, rather than the drawer's first; read once per page, as it opens
  const swap = useRef<{ id: string; swapped: boolean } | null>(null);
  if (swap.current?.id !== pageId) swap.current = { id: pageId, swapped: shown.current !== null && shown.current !== pageId };
  // Opened from the map, by a click or the keys: the title takes the focus, so the page is read from its top and
  // announced, and Tab moves on to the text
  const titleFirst = !fromDrawer && !isNew;
  const cursor: EditorFocus | null = titleFirst ? null : fromDrawer ? (cursors.get(pageId) ?? 'start') : 'end';
  useEffect(() => {
    shown.current = pageId;
  }, [shown, pageId]);

  return {
    controls,
    state: {
      pageId,
      before,
      swapped: swap.current.swapped,
      titleFirst,
      cursor,
    },
    operations: {
      // Moving between pages replaces the entry, so back still closes the drawer in one step
      go: (id: string, alternate = false) => {
        // With Cmd/Ctrl, as a full page: loaded whole, since moving there within the app would land in the drawer again
        if (alternate) return window.location.assign(pageHref(pathId, id));
        if (id === pageId) return;
        setTrail({ before: [...before, pageId], at: id });
        swapOpenPage(pageHref(pathId, id));
      },
      goBack: (to: string, rest: ReadonlyArray<string>) => {
        setTrail({ before: rest, at: to });
        swapOpenPage(pageHref(pathId, to));
      },
      rememberCursor: (id: string, pos: number) => cursors.set(id, pos),
    },
  };
}
